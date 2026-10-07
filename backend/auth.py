import os
import psycopg
from psycopg.rows import dict_row
import hashlib
import hmac
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr, Field


# ============================================================
# SMARTCLASSAI - AUTHENTICATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TOKEN_SECRET = os.getenv(
    "SMARTCLASSAI_TOKEN_SECRET",
    "smartclassai-development-secret-change-this",
)

OTP_EXPIRY_MINUTES = 10


# ============================================================
# DATABASE
# ============================================================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not configured. "
        "Please add DATABASE_URL to the environment variables."
    )


class DatabaseConnection:
    """
    PostgreSQL connection wrapper.

    Existing authentication code uses SQLite-style ? placeholders.
    This wrapper converts ? to PostgreSQL %s automatically.
    """

    def __init__(self):
        self.connection = psycopg.connect(
            DATABASE_URL,
            row_factory=dict_row,
        )

    def execute(self, query, params=None):
        query = query.replace("?", "%s")

        if params is None:
            return self.connection.execute(query)

        return self.connection.execute(
            query,
            params,
        )

    def commit(self):
        self.connection.commit()

    def rollback(self):
        self.connection.rollback()

    def close(self):
        self.connection.close()


def get_connection():
    return DatabaseConnection()


def initialize_database():
    connection = get_connection()

    # --------------------------------------------------------
    # Registered college accounts
    # --------------------------------------------------------
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            college_name TEXT NOT NULL,
            college_id TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'college',
            is_verified INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL
        )
        """
    )

    # --------------------------------------------------------
    # Temporary registrations
    # --------------------------------------------------------
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS pending_registrations (
            id BIGSERIAL PRIMARY KEY,
            college_name TEXT NOT NULL,
            college_id TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    # --------------------------------------------------------
    # OTP records
    # --------------------------------------------------------
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS otp_codes (
            id BIGSERIAL PRIMARY KEY,
            college_id TEXT,
            email TEXT NOT NULL,
            otp_hash TEXT NOT NULL,
            purpose TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )

    connection.commit()
    connection.close()


initialize_database()



# ============================================================
# SECURITY HELPERS
# ============================================================

def hash_secret(value: str) -> str:
    salt = secrets.token_bytes(16)

    derived_key = hashlib.scrypt(
        value.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=64,
    )

    return f"{salt.hex()}:{derived_key.hex()}"


def verify_secret(value: str, stored_hash: str) -> bool:
    try:
        salt_hex, expected_hex = stored_hash.split(":", 1)
        salt = bytes.fromhex(salt_hex)

        derived_key = hashlib.scrypt(
            value.encode("utf-8"),
            salt=salt,
            n=2**14,
            r=8,
            p=1,
            dklen=64,
        )

        return hmac.compare_digest(
            derived_key.hex(),
            expected_hex,
        )
    except Exception:
        return False


def hash_otp(otp: str) -> str:
    return hashlib.sha256(
        otp.encode("utf-8")
    ).hexdigest()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().isoformat()


# ============================================================
# EMAIL / OTP
# ============================================================

def send_email(
    recipient: str,
    subject: str,
    body: str,
) -> bool:
    """
    Send an email through SMTP when SMTP settings are configured.

    Without SMTP configuration, return False so the development
    OTP can be printed in the backend terminal.
    """

    smtp_host = os.getenv("SMARTCLASSAI_SMTP_HOST")
    smtp_port = int(
        os.getenv(
            "SMARTCLASSAI_SMTP_PORT",
            "587",
        )
    )
    smtp_username = os.getenv(
        "SMARTCLASSAI_SMTP_USERNAME"
    )
    smtp_password = os.getenv(
        "SMARTCLASSAI_SMTP_PASSWORD"
    )
    smtp_from = os.getenv(
        "SMARTCLASSAI_SMTP_FROM_EMAIL",
        smtp_username or "",
    )

    if not all(
        [
            smtp_host,
            smtp_username,
            smtp_password,
            smtp_from,
        ]
    ):
        return False

    message = EmailMessage()
    message["From"] = smtp_from
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(
        smtp_host,
        smtp_port,
        timeout=20,
    ) as server:
        server.starttls()
        server.login(
            smtp_username,
            smtp_password,
        )
        server.send_message(message)

    return True


def create_and_send_otp(
    college_id: Optional[str],
    email: str,
    purpose: str,
):
    otp = f"{secrets.randbelow(1_000_000):06d}"

    created_at = utc_now()
    expires_at = created_at + timedelta(
        minutes=OTP_EXPIRY_MINUTES
    )

    connection = get_connection()

    # Invalidate older OTPs for the same email/purpose.
    connection.execute(
        """
        UPDATE otp_codes
        SET used = 1
        WHERE email = ?
          AND purpose = ?
          AND used = 0
        """,
        (
            email,
            purpose,
        ),
    )

    connection.execute(
        """
        INSERT INTO otp_codes (
            college_id,
            email,
            otp_hash,
            purpose,
            expires_at,
            used,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, 0, ?)
        """,
        (
            college_id,
            email,
            hash_otp(otp),
            purpose,
            expires_at.isoformat(),
            created_at.isoformat(),
        ),
    )

    connection.commit()
    connection.close()

    if purpose == "registration":
        subject = "SmartClassAI Email Verification OTP"
    else:
        subject = "SmartClassAI Password Reset OTP"

    body = (
        "Your SmartClassAI OTP is: "
        + otp
        + "\n\n"
        + "This OTP expires in "
        + str(OTP_EXPIRY_MINUTES)
        + " minutes."
    )

    try:
        email_sent = send_email(
            email,
            subject,
            body,
        )
    except Exception as error:
        email_sent = False
        print(
            "SMTP email sending failed:",
            str(error),
        )

    if not email_sent:
        raise RuntimeError(
            "OTP email could not be sent. Please check the SmartClassAI SMTP configuration."
        )

    return email_sent


def find_valid_otp(
    college_id: Optional[str],
    email: str,
    otp: str,
    purpose: str,
):
    connection = get_connection()

    row = connection.execute(
        """
        SELECT *
        FROM otp_codes
        WHERE email = ?
          AND purpose = ?
          AND used = 0
        ORDER BY id DESC
        LIMIT 1
        """,
        (
            email,
            purpose,
        ),
    ).fetchone()

    connection.close()

    if row is None:
        return None

    if (
        college_id
        and row["college_id"]
        and row["college_id"] != college_id
    ):
        return None

    try:
        expires_at = datetime.fromisoformat(
            row["expires_at"]
        )
    except Exception:
        return None

    if utc_now() > expires_at:
        return None

    if not hmac.compare_digest(
        row["otp_hash"],
        hash_otp(otp),
    ):
        return None

    return row


def consume_otp(otp_id: int):
    connection = get_connection()

    connection.execute(
        """
        UPDATE otp_codes
        SET used = 1
        WHERE id = ?
        """,
        (otp_id,),
    )

    connection.commit()
    connection.close()


# ============================================================
# TOKEN
# ============================================================

def create_token(
    user_id: int,
    role: str,
) -> str:
    issued_at = int(
        utc_now().timestamp()
    )
    expires_at = issued_at + (
        8 * 60 * 60
    )

    payload = (
        f"{user_id}|"
        f"{role}|"
        f"{issued_at}|"
        f"{expires_at}"
    )

    signature = hmac.new(
        TOKEN_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return f"{payload}|{signature}"


def decode_token(token: str):
    try:
        parts = token.split("|")

        if len(parts) != 5:
            return None

        user_id = int(parts[0])
        role = parts[1]
        issued_at = int(parts[2])
        expires_at = int(parts[3])
        signature = parts[4]

        payload = (
            f"{user_id}|"
            f"{role}|"
            f"{issued_at}|"
            f"{expires_at}"
        )

        expected_signature = hmac.new(
            TOKEN_SECRET.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(
            signature,
            expected_signature,
        ):
            return None

        if int(utc_now().timestamp()) > expires_at:
            return None

        return {
            "user_id": user_id,
            "role": role,
        }

    except Exception:
        return None


# ============================================================
# REQUEST MODELS
# ============================================================

class RegisterRequest(BaseModel):
    college_name: str = Field(
        min_length=1,
        max_length=200,
    )
    college_id: str = Field(
        min_length=1,
        max_length=100,
    )
    email: EmailStr
    password: str = Field(
        min_length=6,
        max_length=200,
    )
    confirm_password: str = Field(
        min_length=6,
        max_length=200,
    )


class VerifyRegistrationRequest(BaseModel):
    college_id: str = Field(
        min_length=1,
        max_length=100,
    )
    email: EmailStr
    otp: str = Field(
        min_length=6,
        max_length=6,
    )


class LoginRequest(BaseModel):
    """
    Login accepts College ID OR Email.

    Both fields are optional at the schema level because the
    frontend has one combined "College ID or Email" input.
    The endpoint checks that at least one is supplied.
    """

    college_id: Optional[str] = None
    email: Optional[EmailStr] = None
    password: str = Field(
        min_length=1,
        max_length=200,
    )


class ForgotPasswordRequest(BaseModel):
    college_id: Optional[str] = None
    email: Optional[EmailStr] = None


class ForgotPasswordVerifyRequest(BaseModel):
    college_id: Optional[str] = None
    email: Optional[EmailStr] = None
    otp: str = Field(
        min_length=6,
        max_length=6,
    )


class ResetPasswordRequest(BaseModel):
    college_id: Optional[str] = None
    email: Optional[EmailStr] = None
    otp: str = Field(
        min_length=6,
        max_length=6,
    )
    new_password: str = Field(
        min_length=6,
        max_length=200,
    )
    confirm_password: str = Field(
        min_length=6,
        max_length=200,
    )


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ============================================================
# AUTH DEPENDENCIES
# ============================================================

def get_current_user(
    authorization: Optional[str] = Header(
        default=None
    ),
):
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    if not authorization.lower().startswith(
        "bearer "
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header.",
        )

    token = authorization[7:].strip()

    decoded = decode_token(token)

    if decoded is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token.",
        )

    connection = get_connection()

    user = connection.execute(
        """
        SELECT
            id,
            college_name,
            college_id,
            email,
            role,
            is_verified,
            status,
            created_at
        FROM users
        WHERE id = ?
        """,
        (decoded["user_id"],),
    ).fetchone()

    connection.close()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User account not found.",
        )

    if user["status"] != "active":
        raise HTTPException(
            status_code=403,
            detail="User account is inactive.",
        )

    return dict(user)


def require_admin(
    current_user=Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required.",
        )

    return current_user


# ============================================================
# HEALTH
# ============================================================

@router.get("/health")
def auth_health():
    return {
        "status": "ok",
        "service": "SmartClassAI Authentication",
    }


# ============================================================
# REGISTER
# ============================================================

@router.post("/register")
def register(
    data: RegisterRequest,
):
    college_name = data.college_name.strip()
    college_id = data.college_id.strip()
    email = str(data.email).strip().lower()

    if not college_name or not college_id:
        raise HTTPException(
            status_code=400,
            detail="College name and College ID are required.",
        )

    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Password and confirm password do not match.",
        )

    connection = get_connection()

    # --------------------------------------------------------
    # Only VERIFIED accounts count as registered accounts.
    # --------------------------------------------------------
    existing_college = connection.execute(
        """
        SELECT id
        FROM users
        WHERE college_id = ?
          AND is_verified = 1
        LIMIT 1
        """,
        (college_id,),
    ).fetchone()

    if existing_college is not None:
        connection.close()
        raise HTTPException(
            status_code=409,
            detail="College ID is already registered.",
        )

    existing_email = connection.execute(
        """
        SELECT id
        FROM users
        WHERE email = ?
          AND is_verified = 1
        LIMIT 1
        """,
        (email,),
    ).fetchone()

    if existing_email is not None:
        connection.close()
        raise HTTPException(
            status_code=409,
            detail="Email is already registered.",
        )

    # --------------------------------------------------------
    # Incomplete registrations are temporary.
    #
    # If the same College ID/email starts registration again,
    # update the pending record and issue a fresh OTP.
    # --------------------------------------------------------
    pending_by_college = connection.execute(
        """
        SELECT id, email
        FROM pending_registrations
        WHERE college_id = ?
        LIMIT 1
        """,
        (college_id,),
    ).fetchone()

    pending_by_email = connection.execute(
        """
        SELECT id, college_id
        FROM pending_registrations
        WHERE email = ?
        LIMIT 1
        """,
        (email,),
    ).fetchone()

    if (
        pending_by_college is not None
        and pending_by_email is not None
        and pending_by_college["id"] != pending_by_email["id"]
    ):
        connection.close()
        raise HTTPException(
            status_code=409,
            detail="College ID or email is already being used by another pending registration.",
        )

    pending_id = None

    if pending_by_college is not None:
        pending_id = pending_by_college["id"]
    elif pending_by_email is not None:
        pending_id = pending_by_email["id"]

    password_hash = hash_secret(data.password)
    created_at = iso_now()

    if pending_id is not None:
        connection.execute(
            """
            UPDATE pending_registrations
            SET
                college_name = ?,
                college_id = ?,
                email = ?,
                password_hash = ?,
                created_at = ?
            WHERE id = ?
            """,
            (
                college_name,
                college_id,
                email,
                password_hash,
                created_at,
                pending_id,
            ),
        )
    else:
        connection.execute(
            """
            INSERT INTO pending_registrations (
                college_name,
                college_id,
                email,
                password_hash,
                created_at
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                college_name,
                college_id,
                email,
                password_hash,
                created_at,
            ),
        )

    # Remove previous registration OTPs for this registration.
    connection.execute(
        """
        UPDATE otp_codes
        SET used = 1
        WHERE purpose = 'registration'
          AND used = 0
          AND (
                college_id = ?
                OR email = ?
              )
        """,
        (
            college_id,
            email,
        ),
    )

    connection.commit()
    connection.close()

    # A pending registration is NOT a registered account.
    create_and_send_otp(
        college_id=college_id,
        email=email,
        purpose="registration",
    )

    return {
        "message": "Registration details saved temporarily. An OTP has been sent to your registered email. Your college account will be created only after OTP verification.",
    }


# ============================================================
# VERIFY REGISTRATION OTP
# ============================================================

@router.post("/verify-registration")
def verify_registration(
    data: VerifyRegistrationRequest,
):
    college_id = data.college_id.strip()
    email = str(data.email).strip().lower()
    otp = data.otp.strip()

    otp_row = find_valid_otp(
        college_id=college_id,
        email=email,
        otp=otp,
        purpose="registration",
    )

    if otp_row is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP.",
        )

    connection = get_connection()

    pending = connection.execute(
        """
        SELECT
            id,
            college_name,
            college_id,
            email,
            password_hash,
            created_at
        FROM pending_registrations
        WHERE college_id = ?
          AND email = ?
        LIMIT 1
        """,
        (
            college_id,
            email,
        ),
    ).fetchone()

    if pending is None:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Pending registration not found. Please register again.",
        )

    # Check again immediately before creating the account.
    existing_college = connection.execute(
        """
        SELECT id
        FROM users
        WHERE college_id = ?
          AND is_verified = 1
        LIMIT 1
        """,
        (college_id,),
    ).fetchone()

    if existing_college is not None:
        connection.close()
        raise HTTPException(
            status_code=409,
            detail="College ID is already registered.",
        )

    existing_email = connection.execute(
        """
        SELECT id
        FROM users
        WHERE email = ?
          AND is_verified = 1
        LIMIT 1
        """,
        (email,),
    ).fetchone()

    if existing_email is not None:
        connection.close()
        raise HTTPException(
            status_code=409,
            detail="Email is already registered.",
        )

    try:
        # ----------------------------------------------------
        # THIS is the actual account creation point.
        # The user enters users only after OTP verification.
        # ----------------------------------------------------
        cursor = connection.execute(
            """
            INSERT INTO users (
                college_name,
                college_id,
                email,
                password_hash,
                role,
                is_verified,
                status,
                created_at
            )
            VALUES (?, ?, ?, ?, 'college', 1, 'active', ?)
              RETURNING id
            """,
            (
                pending["college_name"],
                pending["college_id"],
                pending["email"],
                pending["password_hash"],
                pending["created_at"],
            ),
        )

        new_user_id = cursor.fetchone()["id"]

        connection.execute(
            """
            DELETE FROM pending_registrations
            WHERE id = ?
            """,
            (pending["id"],),
        )

        connection.execute(
            """
            UPDATE otp_codes
            SET used = 1
            WHERE id = ?
            """,
            (otp_row["id"],),
        )

        connection.commit()

    except psycopg.errors.UniqueViolation:
        connection.rollback()
        connection.close()

        raise HTTPException(
            status_code=409,
            detail="College ID or email is already registered.",
        )

    connection.close()

    return {
        "message": "Email verified successfully. Your college account has now been created.",
        "user_id": new_user_id,
    }


# ============================================================
# LOGIN
# ============================================================

@router.post("/login")
def login(
    data: LoginRequest,
):
    college_id = (
        data.college_id.strip()
        if data.college_id
        else ""
    )

    email = (
        str(data.email).strip().lower()
        if data.email
        else ""
    )

    if not college_id and not email:
        raise HTTPException(
            status_code=422,
            detail="Enter your College ID or registered email.",
        )

    connection = get_connection()

    if email:
        user = connection.execute(
            """
            SELECT *
            FROM users
            WHERE email = ?
            LIMIT 1
            """,
            (email,),
        ).fetchone()
    else:
        user = connection.execute(
            """
            SELECT *
            FROM users
            WHERE college_id = ?
            LIMIT 1
            """,
            (college_id,),
        ).fetchone()

    connection.close()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid College ID/email or password.",
        )

    if user["is_verified"] != 1:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email with the OTP before logging in.",
        )

    if user["status"] != "active":
        raise HTTPException(
            status_code=403,
            detail="This account is inactive.",
        )

    if not verify_secret(
        data.password,
        user["password_hash"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid College ID/email or password.",
        )

    token = create_token(
        user_id=user["id"],
        role=user["role"],
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "college_name": user["college_name"],
            "college_id": user["college_id"],
            "email": user["email"],
            "role": user["role"],
            "is_verified": bool(
                user["is_verified"]
            ),
        },
    }


# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me")
def me(
    current_user=Depends(get_current_user),
):
    return current_user


# ============================================================
# FORGOT PASSWORD - SEND OTP
# ============================================================

def find_user_for_recovery(
    college_id: Optional[str],
    email: Optional[str],
):
    connection = get_connection()

    if email:
        user = connection.execute(
            """
            SELECT *
            FROM users
            WHERE email = ?
            LIMIT 1
            """,
            (email,),
        ).fetchone()
    elif college_id:
        user = connection.execute(
            """
            SELECT *
            FROM users
            WHERE college_id = ?
            LIMIT 1
            """,
            (college_id,),
        ).fetchone()
    else:
        user = None

    connection.close()

    return user


@router.post("/forgot-password/request")
def forgot_password_request(
    data: ForgotPasswordRequest,
):
    college_id = (
        data.college_id.strip()
        if data.college_id
        else None
    )

    email = (
        str(data.email).strip().lower()
        if data.email
        else None
    )

    if not college_id and not email:
        raise HTTPException(
            status_code=422,
            detail="Enter your registered College ID or email.",
        )

    user = find_user_for_recovery(
        college_id=college_id,
        email=email,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="Registered account not found.",
        )

    create_and_send_otp(
        college_id=user["college_id"],
        email=user["email"],
        purpose="password_reset",
    )

    return {
        "message": "Password reset OTP has been sent to your registered email.",
    }


# ============================================================
# FORGOT PASSWORD - VERIFY OTP
# ============================================================

@router.post("/forgot-password/verify")
def forgot_password_verify(
    data: ForgotPasswordVerifyRequest,
):
    college_id = (
        data.college_id.strip()
        if data.college_id
        else None
    )

    email = (
        str(data.email).strip().lower()
        if data.email
        else None
    )

    user = find_user_for_recovery(
        college_id=college_id,
        email=email,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="Registered account not found.",
        )

    otp_row = find_valid_otp(
        college_id=user["college_id"],
        email=user["email"],
        otp=data.otp.strip(),
        purpose="password_reset",
    )

    if otp_row is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP.",
        )

    return {
        "message": "OTP verified successfully. You can now create a new password.",
    }


# ============================================================
# FORGOT PASSWORD - RESET PASSWORD
# ============================================================

@router.post("/forgot-password/reset")
def forgot_password_reset(
    data: ResetPasswordRequest,
):
    college_id = (
        data.college_id.strip()
        if data.college_id
        else None
    )

    email = (
        str(data.email).strip().lower()
        if data.email
        else None
    )

    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="New password and confirm password do not match.",
        )

    user = find_user_for_recovery(
        college_id=college_id,
        email=email,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="Registered account not found.",
        )

    otp_row = find_valid_otp(
        college_id=user["college_id"],
        email=user["email"],
        otp=data.otp.strip(),
        purpose="password_reset",
    )

    if otp_row is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP.",
        )

    connection = get_connection()

    connection.execute(
        """
        UPDATE users
        SET password_hash = ?
        WHERE id = ?
        """,
        (
            hash_secret(data.new_password),
            user["id"],
        ),
    )

    connection.commit()
    connection.close()

    consume_otp(otp_row["id"])

    return {
        "message": "Password reset successfully. You can now log in with your new password.",
    }


# ============================================================
# ADMIN - VIEW REGISTERED COLLEGES
# ============================================================

@router.get("/admin/users")
def admin_users(
    current_user=Depends(require_admin),
):
    connection = get_connection()

    users = connection.execute(
        """
        SELECT
            id,
            college_name,
            college_id,
            email,
            role,
            is_verified,
            status,
            created_at
        FROM users
        ORDER BY created_at DESC
        """
    ).fetchall()

    connection.close()

    return {
        "users": [
            {
                "id": row["id"],
                "college_name": row["college_name"],
                "college_id": row["college_id"],
                "email": row["email"],
                "role": row["role"],
                "is_verified": bool(
                    row["is_verified"]
                ),
                "status": row["status"],
                "created_at": row["created_at"],
            }
            for row in users
        ]
    }

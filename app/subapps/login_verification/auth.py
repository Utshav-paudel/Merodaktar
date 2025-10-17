# app/subapps/login_verification/auth.py
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import pyotp
import qrcode
import io
import base64

router = APIRouter(tags=["authentication"])

# Security configuration
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours instead of 30 minutes

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# In-memory storage (replace with database)
users_db = {}
mfa_secrets = {}

# Pydantic models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    date_of_birth: str
    enable_mfa: bool = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    mfa_token: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user_info: dict

class MFASetup(BaseModel):
    secret: str
    qr_code: str
    backup_codes: list

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_mfa_secret(email: str):
    """Generate TOTP secret for MFA"""
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=email,
        issuer_name="MeroDaktar"
    )
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    
    qr_code_base64 = base64.b64encode(buf.getvalue()).decode()
    
    # Generate backup codes
    backup_codes = [pyotp.random_base32()[:8] for _ in range(10)]
    
    return secret, qr_code_base64, backup_codes

def verify_mfa_token(secret: str, token: str) -> bool:
    """Verify TOTP token"""
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=2)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    print(f"=== GET_CURRENT_USER DEBUG ===")
    print(f"Received token: {token[:50]}..." if token else "No token received")
    print(f"SECRET_KEY: {SECRET_KEY}")
    print(f"ALGORITHM: {ALGORITHM}")
    print(f"Current users in database: {list(users_db.keys())}")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        print(f"Attempting to decode JWT token...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"JWT payload decoded successfully: {payload}")
        
        email: str = payload.get("sub")
        print(f"Email from token: {email}")
        
        if email is None:
            print(f"ERROR: No email found in token payload")
            raise credentials_exception
            
    except JWTError as e:
        print(f"JWT Error: {str(e)}")
        print(f"JWT Error type: {type(e)}")
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected error during JWT decode: {str(e)}")
        print(f"Unexpected error type: {type(e)}")
        raise credentials_exception
    
    user = users_db.get(email)
    print(f"User found in database: {user is not None}")
    if user:
        print(f"User details: email={user.get('email')}, full_name={user.get('full_name')}")
    
    if user is None:
        print(f"ERROR: User {email} not found in database")
        raise credentials_exception
        
    print(f"=== GET_CURRENT_USER SUCCESS ===")
    return user

# API Routes
@router.post("/register")
async def register(user: UserRegister):
    """Register a new user with optional MFA setup"""
    print(f"=== REGISTER ENDPOINT HIT ===")
    print(f"Registration attempt for email: {user.email}")
    print(f"User data received: {user.dict()}")
    print(f"Current users in database: {list(users_db.keys())}")
    
    if user.email in users_db:
        print(f"Email {user.email} already exists in database")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    print(f"Processing new registration for {user.email}")
    hashed_password = get_password_hash(user.password)
    user_data = {
        "email": user.email,
        "hashed_password": hashed_password,
        "full_name": user.full_name,
        "phone": user.phone,
        "date_of_birth": user.date_of_birth,
        "mfa_enabled": user.enable_mfa,
        "created_at": datetime.utcnow().isoformat()
    }
    
    mfa_response = None
    if user.enable_mfa:
        secret, qr_code, backup_codes = generate_mfa_secret(user.email)
        mfa_secrets[user.email] = {
            "secret": secret,
            "backup_codes": backup_codes
        }
        mfa_response = {
            "mfa_enabled": True,
            "qr_code": f"data:image/png;base64,{qr_code}",
            "backup_codes": backup_codes
        }
    
    users_db[user.email] = user_data
    print(f"User {user.email} registered successfully")
    print(f"Updated users database: {list(users_db.keys())}")
    
    return {
        "message": "User registered successfully",
        "user": {
            "email": user.email,
            "full_name": user.full_name
        },
        "mfa_setup": mfa_response
    }

@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login with email/password and optional MFA"""
    user = users_db.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if MFA is enabled
    if user.get("mfa_enabled") and form_data.username in mfa_secrets:
        # MFA token should be passed in the password field after a pipe character
        # Format: password|mfa_token
        if "|" in form_data.password:
            password, mfa_token = form_data.password.rsplit("|", 1)
            if not verify_password(password, user["hashed_password"]):
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            if not verify_mfa_token(mfa_secrets[form_data.username]["secret"], mfa_token):
                raise HTTPException(status_code=401, detail="Invalid MFA token")
        else:
            raise HTTPException(
                status_code=401, 
                detail="MFA token required. Format: password|mfa_token"
            )
    
    access_token = create_access_token(data={"sub": user["email"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_info": {
            "email": user["email"],
            "full_name": user["full_name"],
            "mfa_enabled": user.get("mfa_enabled", False)
        }
    }

@router.get("/verify")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """Verify if the current token is valid"""
    return {
        "valid": True,
        "user": {
            "email": current_user["email"],
            "full_name": current_user["full_name"]
        }
    }

@router.post("/enable-mfa")
async def enable_mfa(current_user: dict = Depends(get_current_user)):
    """Enable MFA for the current user"""
    email = current_user["email"]
    
    if current_user.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA is already enabled")
    
    secret, qr_code, backup_codes = generate_mfa_secret(email)
    mfa_secrets[email] = {
        "secret": secret,
        "backup_codes": backup_codes
    }
    
    users_db[email]["mfa_enabled"] = True
    
    return {
        "message": "MFA enabled successfully",
        "qr_code": f"data:image/png;base64,{qr_code}",
        "backup_codes": backup_codes
    }

@router.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify API is working"""
    print("=== TEST ENDPOINT HIT ===")
    return {"message": "API is working!", "timestamp": datetime.utcnow().isoformat()}

@router.delete("/debug/clear-users")
async def clear_users():
    """Debug endpoint to clear all users (remove in production)"""
    global users_db, mfa_secrets
    users_db.clear()
    mfa_secrets.clear()
    return {"message": "All users cleared successfully"}

@router.get("/debug/users")
async def debug_users():
    """Debug endpoint to see current users (remove in production)"""
    return {
        "users": list(users_db.keys()),
        "total_users": len(users_db)
    }
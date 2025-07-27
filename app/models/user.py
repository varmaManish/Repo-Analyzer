from pydantic import BaseModel, EmailStr
from typing import Optional

class UserIn(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    username: str
    email: EmailStr

class UserInDB(UserOut):
    hashed_password: str

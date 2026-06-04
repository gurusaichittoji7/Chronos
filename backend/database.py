from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv
import os

load_dotenv(override=False)

# Use absolute path if provided, otherwise default to local chronos.db
DATABASE_URL = os.getenv("DATABASE_URL", "chronos.db")

# If it's a relative path, make it absolute relative to this file
if not DATABASE_URL.startswith("/"):
    DATABASE_URL = os.path.join(os.path.dirname(__file__), DATABASE_URL)

engine = create_engine(f"sqlite:///{DATABASE_URL}", echo=False)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
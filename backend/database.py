from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv
import os

# load_dotenv won't override existing env vars
load_dotenv(override=False)

DATABASE_URL = os.getenv("DATABASE_URL", "/app/chronos.db")

engine = create_engine(f"sqlite:///{DATABASE_URL}", echo=False)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
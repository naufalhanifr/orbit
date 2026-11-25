"""Server-side admin commands.

    python -m orbit.cli create-founder --email you@example.com --name "Founder" --org "EVORA"
    python -m orbit.cli reset-password --email you@example.com

Passwords are read from a prompt, or from stdin with --password-stdin.
"""

import argparse
import getpass
import sys

from sqlalchemy import select

from orbit.db import SessionLocal
from orbit.errors import DomainError
from orbit.models import Organization, User, UserRole, Workforce, WorkforceType
from orbit.security import hash_password, reset_password


def _read_password(from_stdin: bool) -> str:
    if from_stdin:
        return sys.stdin.readline().rstrip("\n")
    first = getpass.getpass("New password: ")
    if first != getpass.getpass("Repeat password: "):
        raise DomainError("mismatch", "Passwords do not match")
    return first


def create_founder(email: str, name: str, org_name: str, password: str) -> None:
    with SessionLocal() as db:
        if db.scalar(select(User.id).where(User.role == UserRole.FOUNDER)) is not None:
            raise DomainError("exists", "A Founder already exists")
        org = Organization(name=org_name)
        db.add(org)
        db.flush()
        wf = Workforce(organization_id=org.id, type=WorkforceType.HUMAN, name=name, title="Founder")
        db.add(wf)
        db.flush()
        db.add(
            User(
                organization_id=org.id,
                workforce_id=wf.id,
                email=email.strip().lower(),
                password_hash=hash_password(password),
                role=UserRole.FOUNDER,
            )
        )
        db.commit()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="orbit")
    sub = parser.add_subparsers(dest="command", required=True)

    cf = sub.add_parser("create-founder", help="Create the organization and its Founder account")
    cf.add_argument("--email", required=True)
    cf.add_argument("--name", required=True)
    cf.add_argument("--org", required=True)
    cf.add_argument("--password-stdin", action="store_true")

    rp = sub.add_parser("reset-password", help="Reset a password and revoke its sessions")
    rp.add_argument("--email", required=True)
    rp.add_argument("--password-stdin", action="store_true")

    args = parser.parse_args(argv)
    try:
        password = _read_password(args.password_stdin)
        if args.command == "create-founder":
            create_founder(args.email, args.name, args.org, password)
            print("Founder created.")
        else:
            with SessionLocal() as db:
                reset_password(db, args.email, password)
            print("Password reset; existing sessions revoked and lockout cleared.")
    except DomainError as exc:
        print(f"error: {exc.message}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

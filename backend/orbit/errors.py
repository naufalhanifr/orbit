class DomainError(Exception):
    """A business-rule violation. Mapped to an HTTP error by the API layer."""

    status_code = 409

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class NotFound(DomainError):
    status_code = 404

    def __init__(self, what: str):
        super().__init__("not_found", f"{what} not found")

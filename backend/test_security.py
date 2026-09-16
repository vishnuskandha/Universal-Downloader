import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from main import ALLOWED_ORIGINS, app, get_allowed_origins


class CorsPolicyTests(unittest.TestCase):
    def test_configured_frontend_origins_are_parsed_and_normalized(self):
        self.assertEqual(
            get_allowed_origins("https://example.com/, https://admin.example.com"),
            ["https://example.com", "https://admin.example.com"],
        )

    def test_empty_frontend_configuration_uses_local_default(self):
        self.assertEqual(get_allowed_origins("   "), ["http://localhost:5173"])

    def test_cors_does_not_allow_wildcard_origin(self):
        cors = next(m for m in app.user_middleware if m.cls.__name__ == "CORSMiddleware")
        self.assertNotIn("*", cors.kwargs["allow_origins"])
        self.assertEqual(cors.kwargs["allow_origins"], ALLOWED_ORIGINS)
        self.assertEqual(cors.kwargs["allow_methods"], ["POST"])
        self.assertEqual(cors.kwargs["allow_headers"], ["Content-Type"])


if __name__ == "__main__":
    unittest.main()

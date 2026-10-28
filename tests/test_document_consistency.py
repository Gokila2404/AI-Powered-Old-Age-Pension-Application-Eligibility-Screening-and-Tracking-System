import unittest

from backend.services.document_consistency import compare_document_fields


class DocumentConsistencyTest(unittest.TestCase):
    def setUp(self):
        self.personal = {"fullName": "Asha Kumar", "dob": "1960-05-12", "aadhaarLast4": "1234"}
        self.address = {
            "doorNo": "12", "street": "Main Street", "villageTown": "Madurai",
            "district": "Madurai", "state": "Tamil Nadu", "pinCode": "625001",
        }
        self.income = {"annualIncome": 64000, "incomeSource": "Agriculture", "incomeCertificateNo": "INC-2042-1837"}
        self.bank = {
            "accountHolderName": "Asha Kumar", "bankName": "State Bank", "branch": "Madurai",
            "ifscCode": "SBIN0000123", "accountNumber": "12345678901234",
        }

    def compare(self, fields, **kwargs):
        return compare_document_fields(fields, self.personal, self.address, self.income, self.bank, **kwargs)

    def test_all_matching_fields_pass(self):
        result = self.compare({
            "name": {"value": "Asha Kumar"},
            "date_of_birth": {"value": "12/05/1960"},
            "document_number": {"value": "1234 5678 1234"},
            "address": {"value": "12 Main Street Madurai Tamil Nadu 625001"},
            "annual_income": {"value": 64000},
            "certificate_number": {"value": "INC-2042-1837"},
            "bank_name": {"value": "State Bank"},
            "ifsc": {"value": "SBIN0000123"},
            "account_number_masked": {"value": "XXXX XXXX 1234"},
        })
        self.assertEqual(result["status"], "MATCHED")
        self.assertEqual(result["mismatchCount"], 0)
        self.assertNotIn("5678", str(result))

    def test_single_mismatch_requests_correction(self):
        result = self.compare({
            "name": {"value": "Asha Kumar"},
            "date_of_birth": {"value": "1960-05-12"},
            "annual_income": {"value": 66000},
        })
        self.assertEqual(result["status"], "NEEDS_CORRECTION")
        self.assertEqual(result["mismatchCount"], 1)
        self.assertTrue(result["comparisons"][-1]["reason"])

    def test_majority_mismatch_is_rejected_with_reason(self):
        result = self.compare({
            "name": {"value": "Unrelated Person"},
            "date_of_birth": {"value": "1970-01-01"},
            "annual_income": {"value": 64000},
        })
        self.assertEqual(result["status"], "REJECTED")
        self.assertIn("2 of 3", result["reason"])

    def test_unreadable_and_missing_identity_are_not_accepted(self):
        self.assertEqual(self.compare({})["status"], "NEEDS_REVIEW")
        missing_id = self.compare({"name": {"value": "Asha Kumar"}}, require_identity_number=True)
        self.assertEqual(missing_id["status"], "NEEDS_CORRECTION")


if __name__ == "__main__":
    unittest.main()

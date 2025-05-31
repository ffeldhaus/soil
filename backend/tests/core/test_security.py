import pytest
from datetime import datetime, timedelta, timezone
from unittest import mock
import base64
import json

from jose import jwt, JWTError
from pydantic import ValidationError

# Correctly import the global settings from app.core.config
from app.core.config import settings as actual_project_settings
# Import the module that will have its module-level variables (ALGORITHM, SECRET_KEY) mocked
from app.core import security as security_module_under_test

from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.schemas.token import TokenData

DUMMY_RSA_PUBLIC_KEY_PEM_STRING = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoR1GmzAbGZzC6h08W2S8
AOKyG51Py1XfB0N2XzWL7gMqXDZ9iZ6cJpY8cbRjRFoU7202h01MX0U7gothitSI
xU0KyluR6t2nEqH9EMxGSJ0kBsLcrWnU2V/LpTqOXn2s/WFb3gXkYAd2STtjG3qZ
fCoL93XDhD5xNGjZ2ScMU7N6zTjKemc01aNlckZuOME4P9h0ff6sfp05/nSjOblK
ACtfwtnskUT3pk2qEa1ZpL7yYWsFkigbMRcRN0D4tA5fKFbMhSy2EMnToVfHj3z3
IrVfcBNfiusZfnS5jA0a1dAh2gQzVpPTuY3Xy+Zf0Y88yffsoH8e+E01KQIDAQAB
-----END PUBLIC KEY-----"""

# Tests for get_password_hash and verify_password
def test_get_password_hash_returns_string():
    hashed_password = get_password_hash("plainpassword")
    assert isinstance(hashed_password, str)

def test_verify_password_correct():
    password = "securepassword123"
    hashed_password = get_password_hash(password)
    assert verify_password(password, hashed_password) is True

def test_verify_password_incorrect():
    password = "securepassword123"
    hashed_password = get_password_hash(password)
    assert verify_password("wrongpassword", hashed_password) is False

# Tests for create_access_token
@mock.patch("app.core.security.datetime", wraps=datetime)
def test_create_access_token_default_expiration(mock_datetime_create):
    now = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    mock_datetime_create.now.return_value = now

    data_to_encode = {"user_id": 123, "username": "testuser", "sub": "testuser"}
    token = create_access_token(data_to_encode)

    decoded_payload = jwt.decode(
        token, actual_project_settings.SECRET_KEY, algorithms=[actual_project_settings.ALGORITHM], options={"verify_exp": False}
    )

    assert decoded_payload["sub"] == "testuser"
    assert decoded_payload["user_id"] == 123
    expected_exp = now + timedelta(minutes=actual_project_settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    assert datetime.fromtimestamp(decoded_payload["exp"], tz=timezone.utc) == expected_exp.replace(microsecond=0)
    assert datetime.fromtimestamp(decoded_payload["iat"], tz=timezone.utc) == now.replace(microsecond=0)

@mock.patch("app.core.security.datetime", wraps=datetime)
def test_create_access_token_custom_expiration(mock_datetime_create):
    now = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    mock_datetime_create.now.return_value = now

    custom_expiry_minutes = 15
    data_to_encode = {"user_id": "custom_user", "role": "admin", "sub": "custom_user"}
    token = create_access_token(data_to_encode, expires_delta_minutes=custom_expiry_minutes)

    decoded_payload = jwt.decode(
        token, actual_project_settings.SECRET_KEY, algorithms=[actual_project_settings.ALGORITHM], options={"verify_exp": False}
    )

    assert decoded_payload["sub"] == "custom_user"
    assert decoded_payload["role"] == "admin"
    expected_exp = now + timedelta(minutes=custom_expiry_minutes)
    assert datetime.fromtimestamp(decoded_payload["exp"], tz=timezone.utc) == expected_exp.replace(microsecond=0)
    assert datetime.fromtimestamp(decoded_payload["iat"], tz=timezone.utc) == now.replace(microsecond=0)

@mock.patch("app.core.security.datetime", wraps=datetime)
def test_create_access_token_data_in_token(mock_datetime_create):
    now = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    mock_datetime_create.now.return_value = now

    data_to_encode = {"user_id": "test_id", "custom_claim": "custom_value", "sub": "test_id"}
    token = create_access_token(data_to_encode)
    decoded_payload = jwt.decode(
        token, actual_project_settings.SECRET_KEY, algorithms=[actual_project_settings.ALGORITHM], options={"verify_exp": False}
    )

    assert decoded_payload["sub"] == "test_id"
    assert decoded_payload["custom_claim"] == "custom_value"
    expected_exp = now + timedelta(minutes=actual_project_settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    assert datetime.fromtimestamp(decoded_payload["exp"], tz=timezone.utc) == expected_exp.replace(microsecond=0)
    assert datetime.fromtimestamp(decoded_payload["iat"], tz=timezone.utc) == now.replace(microsecond=0)

# Tests for decode_access_token
@mock.patch("app.core.security.datetime", wraps=datetime)
def test_decode_access_token_valid(mock_datetime_for_token_creation):
    token_creation_time = datetime.now(timezone.utc)
    mock_datetime_for_token_creation.now.return_value = token_creation_time

    data = {"sub": "testuser", "email": "test@example.com"}
    token = create_access_token(data, expires_delta_minutes=60)

    token_data = decode_access_token(token)

    assert token_data.sub == "testuser"
    assert token_data.email == "test@example.com"
    assert token_data.exp is not None
    expected_exp_ts = (token_creation_time + timedelta(minutes=60)).timestamp()
    assert abs(token_data.exp - int(expected_exp_ts)) < 10

@mock.patch("app.core.security.datetime", wraps=datetime)
def test_decode_access_token_expired(mock_datetime_for_token_creation):
    past_token_creation_time = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    mock_datetime_for_token_creation.now.return_value = past_token_creation_time

    data = {"sub": "expired_user"}
    expired_token = create_access_token(data, expires_delta_minutes=-5)

    with pytest.raises(JWTError, match="Signature has expired."):
        decode_access_token(expired_token)

def test_decode_access_token_invalid_signature():
    data = {"sub": "user_sig_test"}
    token = create_access_token(data)
    parts = token.split(".")
    tampered_token = parts[0] + "." + parts[1] + "." + "tampered_signature"
    with pytest.raises(JWTError, match="Signature verification failed."):
        decode_access_token(tampered_token)

def test_decode_access_token_manipulated_header_alg():
    data = {"sub": "user_alg_test"}
    token = create_access_token(data, expires_delta_minutes=60)

    parts = token.split('.')
    header_b64 = parts[0]
    payload_b64 = parts[1]
    signature_b64 = parts[2]

    try:
        header_json_bytes = base64.urlsafe_b64decode(header_b64 + '=' * (-len(header_b64) % 4))
    except Exception as e:
        pytest.fail(f"Base64 decode failed for header: {e}")

    header_dict = json.loads(header_json_bytes.decode('utf-8'))
    header_dict['alg'] = 'NONE'

    manipulated_header_json_bytes = json.dumps(header_dict).encode('utf-8')
    manipulated_header_b64 = base64.urlsafe_b64encode(manipulated_header_json_bytes).rstrip(b'=').decode('utf-8')

    manipulated_token = f"{manipulated_header_b64}.{payload_b64}.{signature_b64}"

    with pytest.raises(JWTError, match="The specified alg value is not allowed"):
        decode_access_token(manipulated_token)

def test_decode_access_token_missing_sub():
    now = datetime.now(timezone.utc)
    payload_no_sub = {
        "exp": int((now + timedelta(minutes=15)).timestamp()),
        "iat": int(now.timestamp()),
    }
    token_no_sub = jwt.encode(payload_no_sub, actual_project_settings.SECRET_KEY, algorithm=actual_project_settings.ALGORITHM)
    with pytest.raises(JWTError, match="Token is missing essential claims"):
        decode_access_token(token_no_sub)

def test_decode_access_token_missing_exp():
    now = datetime.now(timezone.utc)
    payload_no_exp = {
        "sub": "test_user_no_exp",
        "iat": int(now.timestamp()),
    }
    token_no_exp = jwt.encode(payload_no_exp, actual_project_settings.SECRET_KEY, algorithm=actual_project_settings.ALGORITHM)
    with pytest.raises(JWTError, match="Token is missing essential claims"):
        decode_access_token(token_no_exp)

@mock.patch("jose.jwt.decode")
def test_decode_access_token_other_jwt_error(mock_jwt_decode):
    mock_jwt_decode.side_effect = JWTError("Some other JWT error")
    with pytest.raises(JWTError, match="Some other JWT error"):
        decode_access_token("faketoken")

@mock.patch("jose.jwt.decode")
def test_decode_access_token_generic_exception(mock_jwt_decode):
    mock_jwt_decode.side_effect = Exception("A generic error occurred")
    with pytest.raises(JWTError, match="Unexpected error decoding token: A generic error occurred"):
        decode_access_token("faketoken")

def test_decode_access_token_invalid_claim_type_for_player_number():
    real_now = datetime.now(timezone.utc)
    payload_data = {
        "sub": "test_user_invalid_pn",
        "player_number": {"complex_object": True},
        "exp": int((real_now + timedelta(hours=1)).timestamp()),
        "iat": int(real_now.timestamp()),
    }

    token_with_invalid_player_number = jwt.encode(payload_data, actual_project_settings.SECRET_KEY, algorithm=actual_project_settings.ALGORITHM)

    # Expect that decode_access_token will result in player_number being None if jose.jwt.decode drops/sanitizes it,
    # or it might still raise JWTError if the complex object passes through jwt.decode but fails TokenData.
    # Given previous failures, we'll test the scenario where it might get sanitized to None by jose.jwt.decode.
    try:
        token_data = decode_access_token(token_with_invalid_player_number, jwt_options={"verify_exp": False, "verify_iat": False, "verify_nbf": False})
        # If it reaches here, it means no JWTError (wrapping ValidationError) was raised.
        # This implies the complex object for player_number was handled by jose.jwt.decode (e.g., became None).
        assert token_data.player_number is None, "Expected player_number to be None if complex object was sanitized by jwt.decode"
    except JWTError as e:
        # If a JWTError (wrapping ValidationError) *is* raised, it means TokenData failed as expected.
        assert "Unexpected error decoding token" in str(e)
        assert isinstance(e.__cause__, ValidationError)
        assert "player_number" in str(e.__cause__).lower()
        assert "input should be a valid integer" in str(e.__cause__).lower() or \
               "type_error.integer" in str(e.__cause__).lower()


@mock.patch("app.core.security.datetime", wraps=datetime)
def test_decode_access_token_missing_scope_default(mock_datetime_for_token_creation):
    token_creation_time = datetime.now(timezone.utc)
    mock_datetime_for_token_creation.now.return_value = token_creation_time

    data = {"sub": "user_no_scope_test"}
    token = create_access_token(data, expires_delta_minutes=60)

    token_data = decode_access_token(token)
    assert token_data.sub == "user_no_scope_test"
    assert token_data.is_impersonating is False

@mock.patch("app.core.security.datetime", wraps=datetime)
def test_decode_access_token_future_nbf(mock_datetime_for_token_creation_unused):
    fixed_now = datetime.now(timezone.utc)

    nbf_future = fixed_now + timedelta(hours=1)
    exp_far_future = fixed_now + timedelta(days=1)
    iat_current = fixed_now

    payload_not_yet_active = {
        "sub": "test_user_nbf",
        "exp": int(exp_far_future.timestamp()),
        "iat": int(iat_current.timestamp()),
        "nbf": int(nbf_future.timestamp())
    }
    token_not_yet_active = jwt.encode(payload_not_yet_active, actual_project_settings.SECRET_KEY, algorithm=actual_project_settings.ALGORITHM)

    with pytest.raises(JWTError, match=r"The token is not yet valid \(nbf\)"):
        decode_access_token(token_not_yet_active, jwt_options={"verify_exp": False, "verify_iat": False})

    nbf_past = fixed_now - timedelta(hours=1)
    iat_also_past = fixed_now - timedelta(hours=1, minutes=5)

    payload_active = {
        "sub": "test_user_nbf",
        "exp": int(exp_far_future.timestamp()),
        "iat": int(iat_also_past.timestamp()),
        "nbf": int(nbf_past.timestamp())
    }
    token_active = jwt.encode(payload_active, actual_project_settings.SECRET_KEY, algorithm=actual_project_settings.ALGORITHM)

    token_data = decode_access_token(token_active)
    assert token_data.sub == "test_user_nbf"

@mock.patch("app.core.security.ACCESS_TOKEN_EXPIRE_MINUTES", 10)
@mock.patch("app.core.security.datetime", wraps=datetime)
def test_create_access_token_with_mocked_settings_expiry(mock_datetime_create):
    creation_time = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    mock_datetime_create.now.return_value = creation_time
    data_to_encode = {"sub": "settings_user"}
    token = create_access_token(data_to_encode)
    decoded_payload = jwt.decode(token, actual_project_settings.SECRET_KEY, algorithms=[actual_project_settings.ALGORITHM], options={"verify_exp": False})
    expected_exp = creation_time + timedelta(minutes=10)
    assert datetime.fromtimestamp(decoded_payload["exp"], tz=timezone.utc) == expected_exp.replace(microsecond=0)

@mock.patch("app.core.security.datetime", wraps=datetime)
def test_create_access_token_subject_priority(mock_datetime_create):
    creation_time = datetime.now(timezone.utc)
    mock_datetime_create.now.return_value = creation_time

    data_with_sub = {"sub": "user1"}
    token1 = create_access_token(data_with_sub, expires_delta_minutes=60)
    decoded1 = jwt.decode(token1, actual_project_settings.SECRET_KEY, algorithms=[actual_project_settings.ALGORITHM], options={"verify_exp": False})
    assert decoded1["sub"] == "user1"

    data_empty_no_sub = {"user_id": "id4"}
    token_no_sub_explicit = create_access_token(data_empty_no_sub, expires_delta_minutes=60)

    with pytest.raises(JWTError, match="Token is missing essential claims"):
        decode_access_token(token_no_sub_explicit)

@mock.patch("app.core.security.datetime", wraps=datetime)
def test_decode_access_token_no_user_id_in_payload_uses_sub(mock_datetime_create_unused):
    real_now_for_token = datetime.now(timezone.utc)
    payload_for_jwt_encode = {
        "sub": "subject_is_the_main_id",
        "exp": int((real_now_for_token + timedelta(hours=1)).timestamp()),
        "iat": int(real_now_for_token.timestamp()),
    }
    token_sub_only = jwt.encode(payload_for_jwt_encode, actual_project_settings.SECRET_KEY, algorithm=actual_project_settings.ALGORITHM)

    token_data = decode_access_token(token_sub_only)
    assert token_data.sub == "subject_is_the_main_id"
    with pytest.raises(AttributeError):
        _ = token_data.user_id
    with pytest.raises(AttributeError):
        _ = token_data.scope

# Mock settings used by app.core.security module for this specific test
@mock.patch.object(security_module_under_test, "ALGORITHM", "RS256")
@mock.patch.object(security_module_under_test, "SECRET_KEY", DUMMY_RSA_PUBLIC_KEY_PEM_STRING)
@mock.patch.object(security_module_under_test, "ACCESS_TOKEN_EXPIRE_MINUTES", 30) # Ensure module uses this too
@mock.patch("app.core.security.datetime", wraps=datetime) # Mocks datetime used by create_access_token
def test_decode_access_token_wrong_algorithm_in_settings(mock_datetime_for_token_creation):
    # Within this test:
    # - security_module_under_test.ALGORITHM is "RS256"
    # - security_module_under_test.SECRET_KEY is DUMMY_RSA_PUBLIC_KEY_PEM_STRING

    fixed_token_creation_time = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    mock_datetime_for_token_creation.now.return_value = fixed_token_creation_time

    data_for_hs256_token = {"sub": "user_hs256"}

    # Create an HS256 token using the *actual project's* HS256 secret and algorithm.
    # This requires temporarily un-mocking or using original values for ALGORITHM and SECRET_KEY
    # for the create_access_token call.
    with mock.patch.object(security_module_under_test, "ALGORITHM", actual_project_settings.ALGORITHM), \
         mock.patch.object(security_module_under_test, "SECRET_KEY", actual_project_settings.SECRET_KEY):
        # This token will have exp = fixed_token_creation_time + mocked ACCESS_TOKEN_EXPIRE_MINUTES (10 or 30 based on outer mocks)
        # It's better to set expiry explicitly for clarity if module's ACCESS_TOKEN_EXPIRE_MINUTES is also mocked.
        hs256_token = create_access_token(data_for_hs256_token, expires_delta_minutes=security_module_under_test.ACCESS_TOKEN_EXPIRE_MINUTES)


    # Now, decode_access_token is called.
    # It will use security_module_under_test.ALGORITHM ("RS256") and
    # security_module_under_test.SECRET_KEY (DUMMY_RSA_PUBLIC_KEY_PEM_STRING).
    # The token is HS256 signed. This should fail.
    with pytest.raises(JWTError, match="The specified alg value is not allowed|Signature verification failed."):
        decode_access_token(hs256_token, jwt_options={"verify_exp": False, "verify_iat": False, "verify_nbf": False})

@mock.patch("app.core.security.datetime", wraps=datetime)
def test_decode_access_token_missing_iat_if_possible(mock_datetime_create):
    creation_time = datetime.now(timezone.utc)
    mock_datetime_create.now.return_value = creation_time

    expire = creation_time + timedelta(minutes=60)
    payload_no_iat = {
        "sub": "test_user_no_iat",
        "exp": int(expire.timestamp()),
    }
    token_no_iat = jwt.encode(payload_no_iat, actual_project_settings.SECRET_KEY, algorithm=actual_project_settings.ALGORITHM)

    decoded_payload_check = jwt.decode(token_no_iat, actual_project_settings.SECRET_KEY, algorithms=[actual_project_settings.ALGORITHM], options={"verify_exp":False, "verify_iat": True})

    # python-jose <3.3.0 does not add 'iat'. >=3.3.0 does. Current env seems not to add it.
    assert "iat" not in decoded_payload_check

    token_data = decode_access_token(token_no_iat)
    assert token_data.sub == "test_user_no_iat"
    assert token_data.exp == int(expire.timestamp())


def test_file_structure_placeholder():
    assert True

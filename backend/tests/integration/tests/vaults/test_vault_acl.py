"""ACL matrix: owner / collaborator / outsider x {GET, PATCH, DELETE}."""
import pytest
import requests

from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import DATestUser


@pytest.fixture
def alice(admin_user: DATestUser) -> DATestUser:
    return admin_user


@pytest.fixture
def bob() -> DATestUser:
    return UserManager.create(name="bob")


@pytest.fixture
def carol() -> DATestUser:
    return UserManager.create(name="carol")


def test_private_vault_outsider_404(alice: DATestUser, bob: DATestUser) -> None:
    vault = requests.post(
        f"{API_SERVER_URL}/api/onyx/vaults",
        json={
            "display_name": "Private",
            "visibility": "private",
            "storage_quota_mb": 1024,
        },
        headers=alice.headers,
        cookies=alice.cookies,
    ).json()
    vid = vault["id"]
    assert (
        requests.get(
            f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
            headers=bob.headers,
            cookies=bob.cookies,
        ).status_code
        == 404
    )
    assert (
        requests.patch(
            f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
            json={"display_name": "x"},
            headers=bob.headers,
            cookies=bob.cookies,
        ).status_code
        == 404
    )
    assert (
        requests.delete(
            f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
            headers=bob.headers,
            cookies=bob.cookies,
        ).status_code
        == 404
    )
    requests.delete(
        f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
        headers=alice.headers,
        cookies=alice.cookies,
    )


def test_collaborator_can_read_not_delete(
    alice: DATestUser, bob: DATestUser
) -> None:
    vault = requests.post(
        f"{API_SERVER_URL}/api/onyx/vaults",
        json={
            "display_name": "Shared",
            "visibility": "private",
            "storage_quota_mb": 1024,
        },
        headers=alice.headers,
        cookies=alice.cookies,
    ).json()
    vid = vault["id"]
    requests.post(
        f"{API_SERVER_URL}/api/onyx/vaults/{vid}/members",
        json={"user_id": str(bob.id), "role": "collaborator"},
        headers=alice.headers,
        cookies=alice.cookies,
    )
    assert (
        requests.get(
            f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
            headers=bob.headers,
            cookies=bob.cookies,
        ).status_code
        == 200
    )
    # cloak as 404
    assert (
        requests.delete(
            f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
            headers=bob.headers,
            cookies=bob.cookies,
        ).status_code
        == 404
    )
    requests.delete(
        f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
        headers=alice.headers,
        cookies=alice.cookies,
    )


def test_workspace_visibility_implicit_reader(
    alice: DATestUser, carol: DATestUser
) -> None:
    vault = requests.post(
        f"{API_SERVER_URL}/api/onyx/vaults",
        json={
            "display_name": "WS",
            "visibility": "workspace",
            "storage_quota_mb": 1024,
        },
        headers=alice.headers,
        cookies=alice.cookies,
    ).json()
    vid = vault["id"]
    # carol is in same workspace, never explicitly added; should see it
    resp = requests.get(
        f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
        headers=carol.headers,
        cookies=carol.cookies,
    )
    assert resp.status_code == 200
    assert resp.json()["effective_role"] == "reader"
    requests.delete(
        f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
        headers=alice.headers,
        cookies=alice.cookies,
    )

"""End-to-end vault lifecycle: create -> list -> get -> patch -> delete."""
import requests

from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.test_models import DATestUser


def test_vault_lifecycle(admin_user: DATestUser) -> None:
    # CREATE
    resp = requests.post(
        f"{API_SERVER_URL}/api/onyx/vaults",
        json={
            "display_name": "Lifecycle KB",
            "visibility": "private",
            "storage_quota_mb": 1024,
        },
        headers=admin_user.headers,
        cookies=admin_user.cookies,
    )
    assert resp.status_code == 201, resp.text
    vault = resp.json()
    vid = vault["id"]
    assert vault["rag_tenant_id"].startswith("onyx-")
    assert vault["effective_role"] == "owner"

    # LIST
    lst = requests.get(
        f"{API_SERVER_URL}/api/onyx/vaults",
        headers=admin_user.headers,
        cookies=admin_user.cookies,
    ).json()
    assert any(v["id"] == vid for v in lst["owned"])

    # GET
    detail = requests.get(
        f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
        headers=admin_user.headers,
        cookies=admin_user.cookies,
    ).json()
    assert detail["display_name"] == "Lifecycle KB"

    # PATCH
    patch = requests.patch(
        f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
        json={"display_name": "Renamed KB"},
        headers=admin_user.headers,
        cookies=admin_user.cookies,
    )
    assert patch.status_code == 200
    assert patch.json()["display_name"] == "Renamed KB"

    # DELETE
    delr = requests.delete(
        f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
        headers=admin_user.headers,
        cookies=admin_user.cookies,
    )
    assert delr.status_code == 204

    # GET after delete -> 404
    after = requests.get(
        f"{API_SERVER_URL}/api/onyx/vaults/{vid}",
        headers=admin_user.headers,
        cookies=admin_user.cookies,
    )
    assert after.status_code == 404

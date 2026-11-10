# FR-00005: standard responses (DD-019) used by the client tests. Examples
# only; they are not live data.
extends RefCounted


static func meta(request_id: String = "11111111-2222-4333-8444-555555555555") -> Dictionary:
	return {
		"requestId": request_id,
		"timestamp": "2026-11-08T10:00:00.000Z",
		"service": "gateway",
		"environment": "dev",
		"version": {"id": "version-id", "tag": "dev-20261108-100000", "createdAt": "2026-11-08T09:59:00.000Z"},
	}


const UPDATE_URL := "https://store.example.test/dungeon-destiny"


static func version_ok(supported: bool, up_to_date: bool, update_url: Variant = UPDATE_URL) -> Dictionary:
	return {
		"status": "ok",
		"code": null,
		"message": "version checked",
		"data": {
			"platform": "android",
			"build": 1,
			"minimumBuild": 1 if supported else 2,
			"recommendedBuild": 1 if up_to_date else 2,
			"supported": supported,
			"upToDate": up_to_date,
			"updateUrl": update_url,
		},
		"meta": meta(),
	}


static func health_ok() -> Dictionary:
	return {"status": "ok", "code": null, "message": "gateway is running", "data": null, "meta": meta()}


static func error(code: String, request_id: String = "99999999-2222-4333-8444-555555555555") -> Dictionary:
	return {"status": "error", "code": code, "message": "error", "data": null, "meta": meta(request_id)}

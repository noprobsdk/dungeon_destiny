# FR-00005: each server answer leads to the right outcome (DD-023).
extends GutTest

const Fixtures = preload("res://tests/FR-00005/fixtures.gd")


func _response(http_status: int, body: Dictionary) -> Dictionary:
	var parsed := ResponseParser.parse(JSON.stringify(body))
	return {"kind": "response", "http_status": http_status, "valid": parsed.valid, "body": parsed.body}


func test_supported_and_up_to_date_continues() -> void:
	assert_eq(VersionCheck.version_outcome(_response(200, Fixtures.version_ok(true, true))), VersionCheck.Outcome.CONTINUE)


func test_supported_but_not_up_to_date_offers_an_update() -> void:
	assert_eq(
		VersionCheck.version_outcome(_response(200, Fixtures.version_ok(true, false))),
		VersionCheck.Outcome.UPDATE_AVAILABLE
	)


func test_not_supported_requires_an_update() -> void:
	assert_eq(
		VersionCheck.version_outcome(_response(200, Fixtures.version_ok(false, false))),
		VersionCheck.Outcome.UPDATE_REQUIRED
	)


func test_http_426_requires_an_update() -> void:
	var answer := _response(426, Fixtures.error("APP_UPDATE_REQUIRED"))
	assert_eq(VersionCheck.version_outcome(answer), VersionCheck.Outcome.UPDATE_REQUIRED)
	assert_eq(VersionCheck.health_outcome(answer), VersionCheck.Outcome.UPDATE_REQUIRED)


func test_a_network_error_is_a_connection_error() -> void:
	var answer := {"kind": "network_error", "error": "timeout"}
	assert_eq(VersionCheck.version_outcome(answer), VersionCheck.Outcome.CONNECTION_ERROR)
	assert_eq(VersionCheck.health_outcome(answer), VersionCheck.Outcome.CONNECTION_ERROR)


func test_an_invalid_response_is_a_connection_error() -> void:
	var answer := {"kind": "response", "http_status": 200, "valid": false, "body": {}}
	assert_eq(VersionCheck.version_outcome(answer), VersionCheck.Outcome.CONNECTION_ERROR)
	assert_eq(VersionCheck.health_outcome(answer), VersionCheck.Outcome.CONNECTION_ERROR)


func test_an_error_response_is_a_connection_error() -> void:
	for code in ["INVALID_APP_HEADERS", "SERVER_MISCONFIGURED", "NOT_FOUND"]:
		var answer := _response(400, Fixtures.error(code))
		assert_eq(VersionCheck.version_outcome(answer), VersionCheck.Outcome.CONNECTION_ERROR, code)


func test_version_data_without_the_flags_is_a_connection_error() -> void:
	var body := Fixtures.version_ok(true, true)
	body.data.erase("supported")
	assert_eq(VersionCheck.version_outcome(_response(200, body)), VersionCheck.Outcome.CONNECTION_ERROR)


func test_a_healthy_gateway_continues() -> void:
	assert_eq(VersionCheck.health_outcome(_response(200, Fixtures.health_ok())), VersionCheck.Outcome.CONTINUE)


func test_the_request_id_comes_from_a_valid_response_only() -> void:
	assert_eq(VersionCheck.request_id(_response(500, Fixtures.error("SERVER_MISCONFIGURED"))), "99999999-2222-4333-8444-555555555555")
	assert_eq(VersionCheck.request_id({"kind": "network_error", "error": "timeout"}), "")

# FR-00005: the client accepts only responses in the standard format (DD-019).
extends GutTest

const Fixtures = preload("res://tests/FR-00005/fixtures.gd")


func test_accepts_a_valid_standard_response() -> void:
	var parsed := ResponseParser.parse(JSON.stringify(Fixtures.health_ok()))
	assert_true(parsed.valid)
	assert_eq(parsed.body.status, "ok")
	assert_eq(parsed.body.meta.requestId, "11111111-2222-4333-8444-555555555555")


func test_accepts_a_valid_error_response() -> void:
	var parsed := ResponseParser.parse(JSON.stringify(Fixtures.error("APP_UPDATE_REQUIRED")))
	assert_true(parsed.valid)
	assert_eq(parsed.body.code, "APP_UPDATE_REQUIRED")


func test_rejects_text_that_is_not_json() -> void:
	assert_false(ResponseParser.parse("<html>Bad gateway</html>").valid)
	assert_false(ResponseParser.parse("").valid)


func test_rejects_json_that_is_not_an_object() -> void:
	assert_false(ResponseParser.parse("[1, 2, 3]").valid)
	assert_false(ResponseParser.parse("\"ok\"").valid)


func test_rejects_a_missing_field() -> void:
	for field in ["status", "code", "message", "data", "meta"]:
		var body := Fixtures.health_ok()
		body.erase(field)
		assert_false(ResponseParser.parse(JSON.stringify(body)).valid, "missing %s" % field)


func test_rejects_a_wrong_status() -> void:
	var body := Fixtures.health_ok()
	body.status = "fine"
	assert_false(ResponseParser.parse(JSON.stringify(body)).valid)


func test_rejects_meta_without_a_request_id_or_version() -> void:
	var no_id := Fixtures.health_ok()
	no_id.meta.erase("requestId")
	assert_false(ResponseParser.parse(JSON.stringify(no_id)).valid)
	var no_version := Fixtures.health_ok()
	no_version.meta.erase("version")
	assert_false(ResponseParser.parse(JSON.stringify(no_version)).valid)

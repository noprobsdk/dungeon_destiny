# FR-00005: every request carries the app headers and goes to the gateway.
extends GutTest

const StubTransport = preload("res://tests/FR-00005/stub_transport.gd")
const Fixtures = preload("res://tests/FR-00005/fixtures.gd")


func test_requests_carry_the_platform_and_build_headers() -> void:
	var stub := StubTransport.new()
	stub.queue_response(200, Fixtures.health_ok())
	var client := ApiClient.new(stub, "https://gateway.example.test")
	await client.get_json("/health")
	assert_eq(stub.calls.size(), 1)
	assert_eq(stub.calls[0].url, "https://gateway.example.test/health")
	var headers: PackedStringArray = stub.calls[0].headers
	assert_has(headers, "X-App-Platform: android")
	assert_has(headers, "X-App-Build: %d" % AppInfo.BUILD)


func test_a_response_is_parsed() -> void:
	var stub := StubTransport.new()
	stub.queue_response(200, Fixtures.health_ok())
	var result: Dictionary = await ApiClient.new(stub, "https://gateway.example.test").get_json("/health")
	assert_eq(result.kind, "response")
	assert_eq(result.http_status, 200)
	assert_true(result.valid)


func test_a_network_error_is_reported() -> void:
	var stub := StubTransport.new()
	stub.queue_network_error("timeout")
	var result: Dictionary = await ApiClient.new(stub, "https://gateway.example.test").get_json("/health")
	assert_eq(result.kind, "network_error")
	assert_eq(result.error, "timeout")


func test_the_http_transport_times_out_after_10_seconds() -> void:
	assert_eq(HttpTransport.TIMEOUT_SECONDS, 10.0)

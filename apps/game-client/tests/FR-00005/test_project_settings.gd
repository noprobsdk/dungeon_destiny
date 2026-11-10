# FR-00005: the project settings and the Android export preset (Section 7).
extends GutTest

var preset := ConfigFile.new()


func before_all() -> void:
	assert_eq(preset.load("res://export_presets.cfg"), OK, "export_presets.cfg loads")


func _android_section() -> String:
	for section in preset.get_sections():
		if section.begins_with("preset.") and not section.ends_with(".options"):
			if preset.get_value(section, "platform", "") == "Android":
				return section
	return ""


func test_uses_the_mobile_renderer_in_portrait() -> void:
	assert_eq(ProjectSettings.get_setting("rendering/renderer/rendering_method"), "mobile")
	assert_eq(ProjectSettings.get_setting("display/window/handheld/orientation"), 1, "portrait")
	assert_eq(ProjectSettings.get_setting("display/window/size/viewport_width"), 720)
	assert_eq(ProjectSettings.get_setting("display/window/size/viewport_height"), 1280)
	assert_eq(ProjectSettings.get_setting("display/window/stretch/aspect"), "expand")


func test_has_a_project_icon() -> void:
	var icon: String = ProjectSettings.get_setting("application/config/icon", "")
	assert_eq(icon, "res://icon.svg")
	assert_true(FileAccess.file_exists(icon))


func test_starts_with_the_loading_screen() -> void:
	assert_eq(ProjectSettings.get_setting("application/run/main_scene"), "res://scenes/loading_screen.tscn")


func test_the_gateway_address_is_an_https_project_setting() -> void:
	var url: String = ProjectSettings.get_setting(AppInfo.GATEWAY_URL_SETTING, "")
	assert_string_starts_with(url, "https://")
	assert_eq(AppInfo.gateway_url(), url)


func test_the_android_preset_builds_arm64_only() -> void:
	var options := _android_section() + ".options"
	assert_ne(_android_section(), "", "an Android preset exists")
	assert_true(preset.get_value(options, "architectures/arm64-v8a", false))
	assert_false(preset.get_value(options, "architectures/armeabi-v7a", true))
	assert_false(preset.get_value(options, "architectures/x86", true))
	assert_false(preset.get_value(options, "architectures/x86_64", true))


func test_the_android_preset_uses_the_dev_package_name() -> void:
	var options := _android_section() + ".options"
	assert_eq(preset.get_value(options, "package/unique_name", ""), "com.dungeondestiny.game.dev")


func test_the_version_code_and_name_match_app_info() -> void:
	var options := _android_section() + ".options"
	assert_eq(preset.get_value(options, "version/code", -1), AppInfo.BUILD)
	assert_eq(preset.get_value(options, "version/name", ""), AppInfo.VERSION_NAME)


func test_the_app_may_use_the_internet() -> void:
	var options := _android_section() + ".options"
	assert_true(preset.get_value(options, "permissions/internet", false))


func test_tests_and_gut_are_not_exported() -> void:
	var exclude: String = preset.get_value(_android_section(), "exclude_filter", "")
	assert_string_contains(exclude, "tests/*")
	assert_string_contains(exclude, "addons/gut/*")

# FR-00005: the app's identity. The build number is defined here once; the
# Android export preset's version code must match it (checked by a test), and
# it is sent in the X-App-Build header (DD-023).
class_name AppInfo
extends RefCounted

const VERSION_NAME := "0.1.0"
const BUILD := 1
const PLATFORM := "android"
const GATEWAY_URL_SETTING := "dungeon_destiny/gateway_url"


static func gateway_url() -> String:
	return ProjectSettings.get_setting(GATEWAY_URL_SETTING, "")


static func display_version() -> String:
	return "%s (build %d)" % [VERSION_NAME, BUILD]

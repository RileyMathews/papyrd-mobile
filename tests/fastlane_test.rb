require "minitest/autorun"

# Evaluate release helpers without signing, decrypting secrets, or contacting stores.
def default_platform(*) = nil
def desc(*) = nil
def platform(*) = yield
def lane(*) = nil

module UI
  def self.user_error!(message) = raise(ArgumentError, message)
  def self.success(*) = nil
end

load File.expand_path("../fastlane/Fastfile", __dir__)

class ReleaseTest < Minitest::Test
  def setup
    @runner = Object.new
    ENV["IOS_BUNDLE_IDENTIFIER"] = "com.rileymathews.papyrd"
  end

  def test_android_uses_maximum_across_tracks
    @runner.define_singleton_method(:google_play_track_version_codes) do |**options|
      { "internal" => [12], "alpha" => [30], "beta" => [], "production" => [18] }.fetch(options.fetch(:track))
    end
    assert_equal 31, @runner.send(:next_android_version_code, "test-key")
  end

  def test_android_lookup_failure_does_not_fall_back_to_one
    @runner.define_singleton_method(:google_play_track_version_codes) { |**_| raise "API unavailable" }
    assert_raises(RuntimeError) { @runner.send(:next_android_version_code, "test-key") }
  end

  def test_exact_build_submission_has_full_automatic_release_and_no_reupload
    captured = nil
    @runner.define_singleton_method(:upload_to_app_store) do |**options|
      captured = options
      raise "Metadata directory must exist and be empty" unless Dir.exist?(options.fetch(:metadata_path)) && Dir.children(options.fetch(:metadata_path)).empty?
    end
    @runner.send(:submit_ios_build, api_key: :test, version: "1.0.0", build_number: "2")
    assert_equal "1.0.0", captured.fetch(:app_version)
    assert_equal "2", captured.fetch(:build_number)
    %i[submit_for_review automatic_release skip_binary_upload skip_screenshots].each do |key|
      assert_equal true, captured.fetch(key)
    end
    assert_equal false, captured.fetch(:phased_release)
    assert_equal false, captured.fetch(:skip_metadata), "Deliver must run the release-settings metadata step"
    refute Dir.exist?(captured.fetch(:metadata_path)), "Temporary metadata must be cleaned up"
    assert_equal false, captured.fetch(:precheck_include_in_app_purchases)
  end

  def test_submission_requires_valid_version_and_exact_build
    @runner.define_singleton_method(:upload_to_app_store) { |**_| flunk "Must not contact store" }
    [nil, "", "latest", "0", "-1"].each do |build|
      assert_raises(ArgumentError) { @runner.send(:submit_ios_build, api_key: :test, version: "1.0.0", build_number: build) }
    end
    assert_raises(ArgumentError) { @runner.send(:submit_ios_build, api_key: :test, version: "v1.0.0", build_number: "1") }
  end

  def test_production_upload_waits_for_processing_even_in_ci
    old_ci = ENV["CI"]
    ENV["CI"] = "true"
    captured = nil
    @runner.define_singleton_method(:upload_to_testflight) { |**options| captured = options }
    @runner.send(:upload_ios_build_to_testflight, api_key: :test, ipa: "test.ipa", wait_for_processing: true)
    assert_equal false, captured.fetch(:skip_waiting_for_build_processing)
    assert_equal false, captured.fetch(:uses_non_exempt_encryption)
  ensure
    ENV["CI"] = old_ci
  end
end


import os
import sys
import time

from playwright.sync_api import Page, sync_playwright

SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "verification")


def verify_app_loads(page: Page):
    # Listen for console messages
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"Page Error: {exc}"))

    # Navigate to the app
    page.goto("http://localhost:5173")

    # Wait a bit to ensure initial render happens
    time.sleep(2)

    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

    # Check if the ErrorBoundary's crash overlay is present (see components/ErrorBoundary.tsx).
    error_overlay = page.get_by_text("Application Crashed")
    if error_overlay.is_visible():
        print("Error overlay detected!")
        error_details = page.locator("pre").inner_text()
        print(f"Error Details from UI: {error_details}")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "error_detected.png"))
        raise Exception("Application crashed on load")

    # A fresh browser context has no stored auth token, so the app renders
    # AuthScreen (components/AuthScreen.tsx) - the one screen this check can
    # verify without a running backend.
    page.get_by_role("heading", name="iCompetency").first.wait_for(state="visible", timeout=10000)
    page.get_by_role("button", name="ورود به حساب").first.wait_for(state="visible", timeout=10000)

    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "auth_screen.png"))
    print("App loaded successfully (auth screen rendered), screenshot taken.")


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_app_loads(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            browser.close()
            sys.exit(1)
        browser.close()

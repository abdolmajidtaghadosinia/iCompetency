
from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_app_loads(page: Page):
    # Listen for console messages
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"Page Error: {exc}"))

    # Navigate to the app
    page.goto("http://localhost:5173")

    # Wait a bit to ensure initial render happens
    time.sleep(2)
    
    # Check if the critical error overlay is present.
    error_overlay = page.get_by_text("Application Startup Failed")
    if error_overlay.is_visible():
        print("Error overlay detected!")
        error_details = page.locator("pre").inner_text()
        print(f"Error Details from UI: {error_details}")
        page.screenshot(path="/home/jules/verification/error_detected.png")
        raise Exception("Application failed to start")

    # Expect some dashboard content
    # Use .first to pick the first occurrence if multiple exist, or use a more specific locator
    # The dashboard header says "سلام، آنـجـلا دلا 👋"
    expect(page.get_by_role("heading", name="سلام، آنـجـلا دلا").first).to_be_visible()

    # Take a screenshot
    page.screenshot(path="/home/jules/verification/dashboard.png")
    print("Dashboard loaded successfully, screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_app_loads(page)
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()

# :horse: SEU DailyReport
Automation tool for some repetitive daily report tasks during Covid-19.

This tool is explicitly written for SouthEast University students.

You may adapt it to your school's reporting platform.

# :gift: Usage
This tool is based on puppeteer and includes `puppeteer-core`, which means you should have Chrome or Chromium installed first.

1. Clone the repository to a proper location.

1. Create `config.js` according to `config.js.example`, fill in `browser.executablePath` and `browser.userDataDir` properly.

1. Run `node main.js` to validate your settings.

1. Setup a proper cron job, then enjoy :)

# :cloud: Push API
This tool may push the current status to a RESTful API after each report.

The feature is designed for Telegram pushing. However, it should work in other scenarios (Mail, IFTTT, QQ, SMS, etc.)

To use it, simply set `push_api` to your API endpoint in `config.js`.

The tool will make a POST request using `application/x-www-form-urlencoded` body encoding.

HTTP body contains one parameter: `message=<A friendly message containing emoji>`.

You may authenticate yourself via query string or a serverside relay script.

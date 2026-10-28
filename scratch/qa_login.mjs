export default async function run(page, ui) {
  // Inject an authenticated session directly, then load the wizard's document step.
  const out = {};
  // Grab a token the same way the app would: via admin login is OTP-gated, so
  // we mint one server-side is impossible from the browser. Instead test as a
  // regular flow: go to login, sign in with admin creds, handle OTP gate error.
  await page.goto("http://localhost:5173/login");
  await page.waitForTimeout(1500);
  out.loginPage = (await ui.snapshot({ full: true })).slice(0, 2000);
  return out;
}

import "./Login.css";

export function LoginPage() {
  return (
    <main className="login-page">
      <div className="form-wrapper">
        <h1>Login</h1>
        <form className="login-form" action="">
          <p>Email</p>
          <input type="email" placeholder="example@gmail.com" />
          <p>Password</p>
          <input type="password" placeholder="password" />
        </form>
        <button className="login-button">Login</button>
        <p>Or Sign Up Using</p>
        <a href="/register">SIGN UP</a>
      </div>
    </main>
  );
}

export default LoginPage;

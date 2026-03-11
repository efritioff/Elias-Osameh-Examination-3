import "./Register.css";

export function RegisterPage() {
  return (
    <main className="register-page">
      <div className="form-wrapper">
        <h1>Register</h1>
        <p className="subtitle">This is the register page.</p>
        <form className="register-form" action="">
          <p>Email</p>
          <input type="email" placeholder="example@gmail.com" />
          <p>Password</p>
          <input type="password" placeholder="password" />
        </form>
        <button className="register-button">Create account</button>
        <p className="footer-text">
          Already have an account? <a href="/login">Go to login</a>
        </p>
      </div>
    </main>
  );
}

export default RegisterPage;

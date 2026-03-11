import "./Register.css";

export function RegisterPage() {
  return (
    <main className="register-page">
      <h1>Register</h1>
      <p>This is the register page.</p>
      <form className="register-form" action="">
        <p>Email</p>
        <input type="email" placeholder="example@gmail.com" />
        <p>Password</p>
        <input type="password" placeholder="password" />
      </form>
      <button className="register-button">Create account</button>
      <p>
        Already have an account? <a href="/login">Go to login</a>
      </p>
    </main>
  );
}

export default RegisterPage;

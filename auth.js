// Authentication logic
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBox = document.getElementById('login-box');
const registerBox = document.getElementById('register-box');

// Toggle between login and register
function toggleAuthForm() {
    loginBox.classList.toggle('hidden');
    registerBox.classList.toggle('hidden');
    // Clear error messages
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
}

// Password strength checker
function checkPasswordStrength(password) {
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');
    
    if (!strengthFill || !strengthText) return;
    
    let strength = 0;
    let feedback = '';
    
    // Length check
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Character variety checks
    if (/[a-z]/.test(password)) strength += 1; // lowercase
    if (/[A-Z]/.test(password)) strength += 1; // uppercase
    if (/[0-9]/.test(password)) strength += 1; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1; // special characters
    
    // Remove all classes first
    strengthFill.className = 'strength-fill';
    strengthText.className = 'strength-text';
    
    // Determine strength level
    if (password.length === 0) {
        strengthText.textContent = '';
        return;
    } else if (strength <= 2) {
        strengthFill.classList.add('weak');
        strengthText.classList.add('weak');
        feedback = '😟 Weak - Add uppercase, numbers, or symbols';
    } else if (strength <= 4) {
        strengthFill.classList.add('medium');
        strengthText.classList.add('medium');
        feedback = '😊 Medium - Add more characters for better security';
    } else {
        strengthFill.classList.add('strong');
        strengthText.classList.add('strong');
        feedback = '😃 Strong - Great password!';
    }
    
    strengthText.textContent = feedback;
}

// Add event listener for password input
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('register-password');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value);
        });
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const role = document.getElementById('login-role').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        
        // Check user role
        const roleSnapshot = await database.ref(`users/${uid}/role`).once('value');
        const userRole = roleSnapshot.val();
        
        if (userRole === role) {
            // Redirect based on role
            if (role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'shop.html';
            }
        } else {
            errorDiv.textContent = 'Role mismatch. Please select the correct role.';
            auth.signOut();
        }
    } catch (error) {
        errorDiv.textContent = getErrorMessage(error.code);
    }
});

// Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    const role = document.getElementById('register-role').value;
    const errorDiv = document.getElementById('register-error');
    
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        return;
    }
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        
        // Save user data
        await database.ref(`users/${uid}`).set({
            name: name,
            email: email,
            role: role,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Update profile
        await userCredential.user.updateProfile({
            displayName: name
        });
        
        errorDiv.style.color = '#22c55e';
        errorDiv.textContent = 'Registration successful! Redirecting...';
        
        // Redirect after 1 second
        setTimeout(() => {
            if (role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'shop.html';
            }
        }, 1000);
    } catch (error) {
        errorDiv.textContent = getErrorMessage(error.code);
    }
});

// Error message helper
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/user-not-found':
            return 'No user found with this email';
        case 'auth/wrong-password':
            return 'Incorrect password';
        case 'auth/email-already-in-use':
            return 'Email already in use';
        case 'auth/weak-password':
            return 'Password is too weak';
        case 'auth/invalid-email':
            return 'Invalid email address';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please try again later';
        default:
            return 'An error occurred. Please try again';
    }
}
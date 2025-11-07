package com.gromber05.delvo.ui.screens

import androidx.compose.runtime.Composable
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.gromber05.delvo.ui.theme.DelvoTheme


@Composable
fun RegisterScreen(
    onNavigateToLogin: () -> Unit,
    onRegistrationSuccess: () -> Unit
) {
    var username by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var agreedToTerms by remember { mutableStateOf(false) }
    var passwordVisible by remember { mutableStateOf(false) }

    val usernameError = if (username.isEmpty()) "El nombre de usuario es requerido" else null
    val emailError = if (email.isEmpty()) "El email es requerido" else null
    val passwordError = if (password.isEmpty()) "La contraseña es requerida" else null
    val confirmPasswordError = when {
        confirmPassword.isEmpty() -> "Confirma tu contraseña"
        confirmPassword != password -> "Las contraseñas no coinciden"
        else -> null
    }

    val isButtonEnabled = username.isNotEmpty() && email.isNotEmpty() &&
            password.isNotEmpty() && confirmPassword == password && agreedToTerms

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surfaceVariant) { // Fondo oscuro
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp)
                .padding(top = 64.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Crea tu Cuenta Delvo",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Únete a la comunidad de mensajería más rápida.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(32.dp))

            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(text = "Nombre de Usuario", style = MaterialTheme.typography.labelLarge)
                    Spacer(modifier = Modifier.height(4.dp))
                    OutlinedTextField(
                        value = username,
                        onValueChange = { username = it },
                        placeholder = { Text("ej. gromber_delvo") },
                        isError = usernameError != null,
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    if (usernameError != null) {
                        Text(
                            text = usernameError,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    Text(text = "Email", style = MaterialTheme.typography.labelLarge)
                    Spacer(modifier = Modifier.height(4.dp))
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        placeholder = { Text("tu@email.com") },
                        isError = emailError != null,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    if (emailError != null) {
                        Text(
                            text = emailError,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    PasswordTextField(
                        label = "Contraseña",
                        value = password,
                        onValueChange = { password = it },
                        isError = passwordError != null,
                        errorMessage = passwordError,
                        passwordVisible = passwordVisible,
                        onVisibilityToggle = { passwordVisible = !passwordVisible }
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    PasswordTextField(
                        label = "Confirmar Contraseña",
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it },
                        isError = confirmPasswordError != null,
                        errorMessage = confirmPasswordError,
                        passwordVisible = passwordVisible,
                        onVisibilityToggle = { /* No hay toggle específico aquí, podría ser una versión simplificada */ }
                    )
                    Spacer(modifier = Modifier.height(24.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = agreedToTerms,
                            onCheckedChange = { agreedToTerms = it },
                            colors = CheckboxDefaults.colors(checkedColor = MaterialTheme.colorScheme.background)
                        )
                        TermsAndPolicyText()
                    }
                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = onRegistrationSuccess,
                        enabled = isButtonEnabled,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.background)
                    ) {
                        Text("Registrarse", style = MaterialTheme.typography.titleMedium)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row {
                Text(
                    text = "¿Ya tienes cuenta?",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "Inicia Sesión",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = MaterialTheme.colorScheme.primary,
                        textDecoration = TextDecoration.Underline
                    ),
                    modifier = Modifier.clickable(onClick = onNavigateToLogin)
                )
            }
        }
    }
}

@Composable
fun PasswordTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    isError: Boolean,
    errorMessage: String?,
    passwordVisible: Boolean,
    onVisibilityToggle: () -> Unit
) {
    Text(text = label, style = MaterialTheme.typography.labelLarge)
    Spacer(modifier = Modifier.height(4.dp))
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text("••••••••") },
        isError = isError,
        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        trailingIcon = {
            val image = if (passwordVisible)
                Icons.Filled.Visibility
            else Icons.Filled.VisibilityOff
            val description = if (passwordVisible) "Ocultar contraseña" else "Mostrar contraseña"

            IconButton(onClick = onVisibilityToggle) {
                Icon(imageVector = image, contentDescription = description)
            }
        }
    )
    if (errorMessage != null && isError) {
        Text(
            text = errorMessage,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
fun TermsAndPolicyText() {
    val annotatedString = buildAnnotatedString {
        append("Acepto los ")
        pushStyle(SpanStyle(color = MaterialTheme.colorScheme.primary, textDecoration = TextDecoration.Underline))
        append("Términos de Servicio")
        pop()
        append(" y la ")
        pushStyle(SpanStyle(color = MaterialTheme.colorScheme.primary, textDecoration = TextDecoration.Underline))
        append("Política de Privacidad.")
        pop()
    }
    Text(annotatedString, style = MaterialTheme.typography.bodySmall)
}

// --- Preview ---
@Preview(showBackground = true)
@Composable
fun RegistrationScreenPreview() {
    DelvoTheme {
        RegisterScreen(
            onNavigateToLogin = {},
            onRegistrationSuccess = {}
        )
    }
}
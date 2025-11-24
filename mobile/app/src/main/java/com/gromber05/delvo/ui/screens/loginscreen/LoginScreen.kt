package com.gromber05.delvo.ui.screens.loginscreen

import android.content.res.Configuration
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.gromber05.delvo.R
import com.gromber05.delvo.core.ui.DelvoTheme
import com.gromber05.delvo.ui.components.UiComponents
import com.gromber05.delvo.ui.viewmodel.AuthViewModel

@Composable
fun LoginScreen(
    loginViewModel: AuthViewModel,
    modifier: Modifier = Modifier,
    onLogin: () -> Unit,
    toRegister: () -> Unit,
    toForgotPassword: () -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    val isLoggedIn by loginViewModel.isLoggedIn.collectAsState()
    val errorMessage by loginViewModel.error.collectAsState()
    val loading by loginViewModel.loading.collectAsState()

    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) {
            onLogin()
        }
    }

    if (errorMessage != null) {
        AlertDialog(
            onDismissRequest = { loginViewModel.clearError() },
            confirmButton = {
                Button(onClick = { loginViewModel.clearError() }) {
                    Text("Aceptar")
                }
            },
            title = { Text("Error al iniciar sesión") },
            text = { Text(errorMessage ?: "Ha ocurrido un error desconocido") }
        )
    }

    if (loading) {
        AlertDialog(
            onDismissRequest = { },
            confirmButton = {},
            title = { Text("Iniciando sesión…") },
            text = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    CircularProgressIndicator()
                }
            }
        )
    }


    Surface(color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(horizontal = 8.dp)
                .padding(top = 48.dp, bottom = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.padding(10.dp))
            Image(
                painter = painterResource(R.drawable.delvo_logo),
                contentDescription = "Logo de Delvo",
                modifier = Modifier.background(Color.Transparent)
                    .height(100.dp)
            )
            Spacer(Modifier.padding(16.dp))
            Text("Bienvenido a Delvo")
            Spacer(Modifier.padding(8.dp))
            Text("Inicia sesión para continuar")
            Spacer(Modifier.padding(8.dp))

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {

                    Text("Correo electrónico", modifier = Modifier.align(Alignment.Start).padding(top = 8.dp))
                    TextField(
                        value = email,
                        onValueChange = { email = it },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                        leadingIcon = { Icon(Icons.Filled.Person, "Icono de persona") },
                        placeholder = {
                            Text("Introduce aquí tú correo...")
                        },
                    )

                    Text("Contraseña", modifier = Modifier.align(Alignment.Start).padding(top = 8.dp))
                    TextField(
                        value = password,
                        onValueChange = { password = it },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                        leadingIcon = { Icon(Icons.Filled.Lock, "Icono de candado") },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            val image = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(imageVector = image, contentDescription = "")
                            }
                        },
                        placeholder = {
                            Text("Introduce aquí tu contraseña...")
                        },
                    )

                    Button(
                        onClick = {
                            loginViewModel.login(email, password)
                        },
                        modifier = Modifier
                            .fillMaxWidth(0.8f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Iniciar sesión")
                    }

                    Button(
                        onClick = {
                            toRegister()
                        },
                        modifier = Modifier.fillMaxWidth(0.8f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(text = "Regístrate")
                    }
                }
            }

            UiComponents.TextDivider("¿Te has olvidado de tu contraseña?")

            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(
                    onClick = toForgotPassword,
                    modifier = Modifier.fillMaxWidth(0.9f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "He olvídado mi contraseña"
                    )
                }
            }

            Box(
                Modifier.weight(1f)
            )

            Text(
                text = "Al iniciar sesión, aceptas todos nuestro términos y condiciones de uso.",
                fontWeight = FontWeight.ExtraLight,
                fontStyle = FontStyle.Italic,
                fontSize = 10.sp,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
        }
    }
}

@Preview
@Composable
fun Preview_LoginScreen() {
    DelvoTheme {
        LoginScreen(
            loginViewModel = viewModel(),
            onLogin = {},
            toRegister = {},
            toForgotPassword = {}
        )
    }
}

@Preview(
    showBackground = true,
    uiMode = Configuration.UI_MODE_NIGHT_YES
)
@Composable
fun PreviewDarkMode_LoginScreen() {
    DelvoTheme {
        LoginScreen(
            loginViewModel = viewModel(),
            onLogin = {},
            toRegister = {},
            toForgotPassword = {},
        )
    }
}


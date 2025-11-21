    package com.gromber05.delvo.ui.screens.homescreen

    import androidx.compose.foundation.layout.Arrangement
    import androidx.compose.foundation.layout.Column
    import androidx.compose.foundation.layout.Spacer
    import androidx.compose.foundation.layout.fillMaxSize
    import androidx.compose.foundation.layout.height
    import androidx.compose.foundation.layout.padding
    import androidx.compose.material3.Button
    import androidx.compose.material3.MaterialTheme
    import androidx.compose.material3.Scaffold
    import androidx.compose.material3.Text
    import androidx.compose.runtime.Composable
    import androidx.compose.runtime.LaunchedEffect
    import androidx.compose.runtime.collectAsState
    import androidx.compose.runtime.getValue
    import androidx.compose.ui.Alignment
    import androidx.compose.ui.Modifier
    import androidx.compose.ui.unit.dp
    import androidx.lifecycle.viewmodel.compose.viewModel
    import com.gromber05.delvo.ui.screens.loginscreen.LoginViewModel

    @Composable
    fun HomeScreen(
        loginViewModel: LoginViewModel,
        onLogout: () -> Unit,
        modifier: Modifier = Modifier
    ) {
        val isLoggedIn by loginViewModel.isLoggedIn.collectAsState()

        LaunchedEffect(isLoggedIn) {
            if (!isLoggedIn) {
                onLogout()
            }
        }

        // UI
        Scaffold(modifier = modifier.fillMaxSize()) { innerPadding ->
            Column(
                modifier = Modifier
                    .padding(innerPadding)
                    .fillMaxSize(),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "¡Has iniciado sesión!",
                    style = MaterialTheme.typography.headlineMedium
                )
                Spacer(modifier = Modifier.height(32.dp))
                Button(onClick = {
                    loginViewModel.logout()
                }) {
                    Text(text = "Cerrar Sesión")
                }
            }
        }
    }

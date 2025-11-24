package com.gromber05.delvo.app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.gromber05.delvo.core.ui.DelvoTheme
import com.gromber05.delvo.ui.navigation.AppScreens
import com.gromber05.delvo.ui.screens.homescreen.HomeScreen
import com.gromber05.delvo.ui.screens.loginscreen.LoginScreen
import com.gromber05.delvo.ui.viewmodel.AuthViewModel
import com.gromber05.delvo.ui.screens.registerscreen.RegisterScreen

@Composable
fun DelvoApp() {
    DelvoTheme {
        val navController = rememberNavController()
        val startDestination = AppScreens.LoginScreen.route

        val loginViewModel: AuthViewModel = hiltViewModel()

        val isLoggedIn by loginViewModel.isLoggedIn.collectAsState()

        NavHost(
            navController = navController,
            startDestination = if (isLoggedIn) AppScreens.HomeScreen.route else AppScreens.LoginScreen.route
        ) {
            composable(AppScreens.LoginScreen.route) {
                LoginScreen(
                    loginViewModel = loginViewModel,
                    onLogin = {
                        navController.navigate(AppScreens.HomeScreen.route) {
                            popUpTo(startDestination) { inclusive = true }
                        }
                    },
                    toRegister = {
                        navController.navigate(AppScreens.HomeScreen.route) {
                            popUpTo(AppScreens.RegisterScreen.route) { inclusive = true }
                        }
                    },
                    toForgotPassword = {

                    },
                    modifier = Modifier
                )
            }

            composable(AppScreens.RegisterScreen.route) {
                RegisterScreen(
                    viewModel = loginViewModel,
                    onRegister = {
                        navController.navigate(AppScreens.RegisterScreen.route) {
                            popUpTo(startDestination) { inclusive = true }
                        }
                    }
                )
            }

            composable(AppScreens.HomeScreen.route) {
                HomeScreen(
                    loginViewModel = loginViewModel,
                    onLogout = {
                        navController.navigate(AppScreens.LoginScreen.route) {
                            popUpTo(startDestination) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}

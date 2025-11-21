package com.gromber05.delvo

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.gromber05.delvo.core.ui.DelvoTheme
import com.gromber05.delvo.ui.navigation.AppScreens
import com.gromber05.delvo.ui.screens.homescreen.HomeScreen
import com.gromber05.delvo.ui.screens.loginscreen.LoginScreen
import com.gromber05.delvo.ui.screens.loginscreen.LoginViewModel
import com.gromber05.delvo.ui.screens.registerscreen.RegisterScreen


@Composable
fun DelvoApp() {
    DelvoTheme {
        val navController = rememberNavController()
        val startDestination = AppScreens.LoginScreen.route

        val loginViewModel: LoginViewModel = hiltViewModel()

        NavHost(
            navController = navController,
            startDestination = startDestination
        ) {
            composable(AppScreens.LoginScreen.route) {
                LoginScreen(
                    viewModel = loginViewModel,
                    onLogin = {
                        navController.navigate(AppScreens.HomeScreen.route) {
                            popUpTo(startDestination) { inclusive = true }
                        }
                    },
                    toRegister = {

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

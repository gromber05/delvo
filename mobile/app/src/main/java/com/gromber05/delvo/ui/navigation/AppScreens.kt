package com.gromber05.delvo.ui.navigation

sealed class AppScreens(val route: String) {
    object HomeScreen: AppScreens(route = "home_screen")
    object LoginScreen: AppScreens(route = "login_screen")
}
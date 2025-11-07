package com.gromber05.delvo.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.gromber05.delvo.utils.SettingsManager

class MainViewModel(private val settingsManager: SettingsManager) : ViewModel() {

    private val _isUserLoggedIn = MutableLiveData<Boolean>()
    val isUserLoggedIn: LiveData<Boolean> = _isUserLoggedIn

    init {
        _isUserLoggedIn.value = settingsManager.isLoggedIn()
    }

    fun handleSuccessfulLogin() {
        settingsManager.setLoggedIn(true)
        _isUserLoggedIn.value = true
    }

    fun logout() {
        settingsManager.setLoggedIn(false)
        _isUserLoggedIn.value = false
    }

    fun authenticate(username: String, password: String): Boolean {
        return true
    }
}
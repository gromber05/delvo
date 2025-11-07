package com.gromber05.delvo.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gromber05.delvo.utils.SettingsManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(private val settingsManager: SettingsManager) : ViewModel() {

    private val _isUserLoggedIn = MutableLiveData<Boolean>()
    val isUserLoggedIn: LiveData<Boolean> = _isUserLoggedIn

    init {
        checkUserLoginStatus()
    }

    private fun checkUserLoginStatus() {
        viewModelScope.launch {
            val isLoggedIn = settingsManager.isLoggedIn()
            _isUserLoggedIn.postValue(isLoggedIn)
        }
    }

    fun handleSuccessfulLogin() {
        viewModelScope.launch {
            settingsManager.setLoggedIn(true)
            _isUserLoggedIn.postValue(true)
        }
    }

    fun logout() {
        viewModelScope.launch {
            settingsManager.setLoggedIn(false)
            _isUserLoggedIn.postValue(false)
        }
    }
}

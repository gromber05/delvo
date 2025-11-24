package com.gromber05.delvo.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gromber05.delvo.domain.repository.AuthRepository
import com.gromber05.delvo.domain.model.SessionUser
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SessionViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _isLoggedIn = MutableStateFlow(authRepository.isLoggedIn())
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn

    private val _currentUser = MutableStateFlow<SessionUser?>(null)
    val currentUser: StateFlow<SessionUser?> = _currentUser

    init {
        viewModelScope.launch {
            authRepository.getCachedUser().collect { user ->
                _currentUser.value = user
                _isLoggedIn.value = user != null
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _isLoggedIn.value = false
            _currentUser.value = null
        }
    }
}


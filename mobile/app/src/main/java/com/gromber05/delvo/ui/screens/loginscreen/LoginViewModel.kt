package com.gromber05.delvo.ui.screens.loginscreen

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gromber05.delvo.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.*
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _loginSuccess = MutableStateFlow(false)
    val loginSuccess: StateFlow<Boolean> = _loginSuccess

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            _loginSuccess.value = false

            val result = authRepository.login(email, password)

            result
                .onSuccess {
                    _loginSuccess.value = true
                }
                .onFailure { e ->
                    _error.value = e.message
                }

            _loading.value = false
        }
    }

    fun clearError() {
        _error.value = null
    }
}

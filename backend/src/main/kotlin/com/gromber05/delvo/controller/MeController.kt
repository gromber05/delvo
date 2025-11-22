package com.gromber05.delvo.controller

import com.google.firebase.auth.FirebaseAuth
import com.gromber05.delvo.domain.MeResponse
import com.gromber05.delvo.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api")
class MeController(
    private val firebaseAuth: FirebaseAuth,
    private val userRepository: UserRepository
) {

    @GetMapping("/me")
    fun me(@RequestHeader("Authorization") authHeader: String): MeResponse {
        val token = authHeader
            .takeIf { it.startsWith("Bearer ") }
            ?.removePrefix("Bearer ")
            ?.trim()
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Header Authorization inválido")

        val decodedToken = try {
            firebaseAuth.verifyIdToken(token)
        } catch (e: Exception) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido")
        }

        val uid = decodedToken.uid

        val user = userRepository.findByUid(uid)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado en BBDD")

        return MeResponse(
            uid = uid,
            isAdmin = user.isAdmin
        )

    }
}

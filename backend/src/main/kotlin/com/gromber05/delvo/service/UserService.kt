package com.gromber05.delvo.service


import com.google.firebase.auth.FirebaseAuth
import com.gromber05.delvo.dto.RegisterUserRequest
import com.gromber05.delvo.dto.UpdateUserRequest
import com.gromber05.delvo.dto.UserResponse
import com.gromber05.delvo.domain.AppUser
import com.gromber05.delvo.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

@Service
class UserService(
    private val firebaseAuth: FirebaseAuth,
    private val userRepository: UserRepository
) {

    private fun toResponse(user: AppUser): UserResponse =
        UserResponse(
            id = user.id,
            uid = user.uid,
            email = user.email,
            username = user.username,
            dob = user.dob,
            rol = user.rol
        )

    fun registerUser(idToken: String, request: RegisterUserRequest): UserResponse {
        val decoded = firebaseAuth.verifyIdToken(idToken)

        val uid = decoded.uid
        val emailFromToken = decoded.email ?: request.email

        // Si ya existe en BBDD, devuélvelo
        val existing = userRepository.findByUid(uid)
        if (existing != null) return toResponse(existing)

        val user = AppUser(
            uid = uid,
            email = emailFromToken,
            username = request.username,
            dob = request.dob,
            rol = request.rol
        )

        return toResponse(userRepository.save(user))
    }

    fun getUser(idToken: String, uid: String): UserResponse {
        val requester = firebaseAuth.verifyIdToken(idToken)
        val requesterUid = requester.uid

        val user = userRepository.findByUid(uid)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado")

        if (requesterUid != uid && !isAdmin(requesterUid)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permisos")
        }

        return toResponse(user)
    }

    fun getAllUsers(idToken: String): List<UserResponse> {
        val requester = firebaseAuth.verifyIdToken(idToken)
        val requesterUid = requester.uid

        if (!isAdmin(requesterUid)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Solo admin puede listar usuarios")
        }

        return userRepository.findAll().map { toResponse(it) }
    }

    fun updateUser(idToken: String, uid: String, update: UpdateUserRequest): UserResponse {
        val requester = firebaseAuth.verifyIdToken(idToken)
        val requesterUid = requester.uid

        val user = userRepository.findByUid(uid)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado")

        if (requesterUid != uid && !isAdmin(requesterUid)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permisos")
        }

        val updated = user.copy(
            username = update.username ?: user.username,
            dob = update.dob ?: user.dob,
            rol = update.rol ?: user.rol
        )

        return toResponse(userRepository.save(updated))
    }

    fun deleteUser(idToken: String, uid: String) {
        val requester = firebaseAuth.verifyIdToken(idToken)
        val requesterUid = requester.uid

        val user = userRepository.findByUid(uid)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado")

        if (requesterUid != uid && !isAdmin(requesterUid)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permisos")
        }

        userRepository.delete(user)
    }

    private fun isAdmin(uid: String): Boolean {
        val user = userRepository.findByUid(uid) ?: return false
        return user.rol == "ADMIN"
    }
}

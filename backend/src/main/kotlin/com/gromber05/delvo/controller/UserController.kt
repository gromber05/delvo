package com.gromber05.delvo.controller

import com.gromber05.delvo.dto.RegisterUserRequest
import com.gromber05.delvo.dto.UpdateUserRequest
import com.gromber05.delvo.dto.UserResponse
import com.gromber05.delvo.service.UserService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/user")
class UserController(
    private val userService: UserService
) {

    private fun extractToken(header: String?): String {
        if (header.isNullOrBlank() || !header.startsWith("Bearer ")) {
            throw org.springframework.web.server.ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Token no proporcionado"
            )
        }
        return header.removePrefix("Bearer").trim()
    }

    @PostMapping
    fun registerUser(
        @RequestHeader("Authorization") authorization: String?,
        @RequestBody body: RegisterUserRequest
    ): ResponseEntity<UserResponse> {
        val token = extractToken(authorization)
        val result = userService.registerUser(token, body)
        return ResponseEntity.status(HttpStatus.CREATED).body(result)
    }

    @GetMapping("/{uid}")
    fun getUser(
        @RequestHeader("Authorization") authorization: String?,
        @PathVariable uid: String
    ): ResponseEntity<UserResponse> {
        val token = extractToken(authorization)
        val result = userService.getUser(token, uid)
        return ResponseEntity.ok(result)
    }

    @GetMapping
    fun getAllUsers(
        @RequestHeader("Authorization") authorization: String?
    ): ResponseEntity<List<UserResponse>> {
        val token = extractToken(authorization)
        val result = userService.getAllUsers(token)
        return ResponseEntity.ok(result)
    }

    @PutMapping("/{uid}")
    fun updateUser(
        @RequestHeader("Authorization") authorization: String?,
        @PathVariable uid: String,
        @RequestBody body: UpdateUserRequest
    ): ResponseEntity<UserResponse> {
        val token = extractToken(authorization)
        val result = userService.updateUser(token, uid, body)
        return ResponseEntity.ok(result)
    }

    @DeleteMapping("/{uid}")
    fun deleteUser(
        @RequestHeader("Authorization") authorization: String?,
        @PathVariable uid: String
    ): ResponseEntity<Unit> {
        val token = extractToken(authorization)
        userService.deleteUser(token, uid)
        return ResponseEntity.noContent().build()
    }
}

package com.internhiring.backend.repository;

import com.internhiring.backend.entity.User;
import com.internhiring.backend.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findBySupabaseId(UUID supabaseId);

    boolean existsByEmail(String email);

    List<User> findByRoleIn(Collection<Role> roles);
}

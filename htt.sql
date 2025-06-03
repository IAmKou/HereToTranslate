drop database htt;
create database htt;
use htt;

create table role(
                   id INT PRIMARY KEY AUTO_INCREMENT,
                   name VARCHAR(50) NOT NULL UNIQUE
);

create table user(
                   id BIGINT PRIMARY KEY AUTO_INCREMENT,
                   username VARCHAR(50) NOT NULL UNIQUE,
                   email VARCHAR(100) NOT NULL UNIQUE,
                   passwordHash VARCHAR(255) NOT NULL,
                   phone varchar(50) not null unique,
                   fullName varchar(100) NOT NULL,
                   roleId int,
                   isActive BOOLEAN NOT NULL DEFAULT 1,
                   createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                   foreign key (roleId) references role(id)
);

CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_user_username ON user(username);
CREATE INDEX idx_user_active ON user(isActive);

CREATE TABLE project (
                       id BIGINT PRIMARY KEY AUTO_INCREMENT,
                       name VARCHAR(255) NOT NULL,
                       description TEXT,
                       createdBy BIGINT NOT NULL,
                       createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       FOREIGN KEY (createdBy) REFERENCES user(id)
);
CREATE INDEX idx_project_name ON project(name);

CREATE TABLE projectRole (
                           id BIGINT PRIMARY KEY AUTO_INCREMENT,
                           projectId BIGINT NOT NULL,
                           userId BIGINT NOT NULL,
                           role ENUM('OWNER','TRANSLATOR','OBSERVER') NOT NULL,
                           FOREIGN KEY (projectId) REFERENCES project(id),
                           FOREIGN KEY (userId) REFERENCES user(id),
                           UNIQUE (projectId, userId) -- each user has one role per project
);

CREATE TABLE project_groups (
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              name VARCHAR(255),
                              project_id BIGINT,
                              FOREIGN KEY (project_id) REFERENCES project(id)
);

CREATE TABLE branch (
                      id BIGINT PRIMARY KEY AUTO_INCREMENT,
                      projectId BIGINT NOT NULL,
                      name VARCHAR(100) NOT NULL,
                      createdBy BIGINT NOT NULL,
                      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      FOREIGN KEY (projectId) REFERENCES project(id),
                      FOREIGN KEY (createdBy) REFERENCES user(id)
);
CREATE INDEX idx_branch_projectId ON branch(projectId);

CREATE TABLE file (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    projectId BIGINT,
                    branchId BIGINT,
                    uploaderId BIGINT NOT NULL,
                    fileName VARCHAR(255) NOT NULL,
                    fileType VARCHAR(50),
                    fileContent LONGBLOB,
                    compiledContent LONGBLOB,
                    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (projectId) REFERENCES project(id),
                    FOREIGN KEY (branchId) REFERENCES branch(id),
                    FOREIGN KEY (uploaderId) REFERENCES user(id)
);
CREATE INDEX idx_file_project ON file(projectId);
CREATE INDEX idx_file_branch ON file(branchId);
CREATE INDEX idx_file_name ON file(fileName);

CREATE TABLE task (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    status ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
                    assignedTo BIGINT,
                    group_id INT,
                    createdBy BIGINT NOT NULL,
                    dueDate DATE,
                    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (assignedTo) REFERENCES user(id),
                    FOREIGN KEY (createdBy) REFERENCES user(id)
);
CREATE INDEX idx_task_assignedTo ON task(assignedTo);
CREATE INDEX idx_task_status ON task(status);

CREATE TABLE requests (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        requester_id BIGINT,
                        project_id BIGINT,
                        title VARCHAR(255),
                        description TEXT,
                        deal_amount DECIMAL(10, 2),
                        deadline DATE,
                        file_url TEXT,
                        status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (requester_id) REFERENCES user(id),
                        FOREIGN KEY (project_id) REFERENCES project(id)
);

CREATE TABLE groupMember (
                           id BIGINT PRIMARY KEY AUTO_INCREMENT,
                           groupId INT NOT NULL,
                           userId BIGINT NOT NULL,
                           addedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           FOREIGN KEY (groupId) REFERENCES project_groups(id),
                           FOREIGN KEY (userId) REFERENCES user(id),
                           UNIQUE (groupId, userId)  -- Prevents duplicate memberships
);

CREATE INDEX idx_groupMember_groupId ON groupMember(groupId);
CREATE INDEX idx_groupMember_userId ON groupMember(userId);


CREATE TABLE commit (
                      id BIGINT PRIMARY KEY AUTO_INCREMENT,
                      branchId BIGINT NOT NULL,
                      project_id BIGINT,
                      authorId BIGINT NOT NULL,
                      message TEXT,
                      content_snapshot TEXT,
                      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      FOREIGN KEY (branchId) REFERENCES branch(id),
                      FOREIGN KEY (authorId) REFERENCES user(id)
);
CREATE INDEX idx_commit_branchId ON commit(branchId);


CREATE TABLE notification (
                            id BIGINT PRIMARY KEY AUTO_INCREMENT,
                            userId BIGINT NOT NULL,
                            type VARCHAR(50) NOT NULL,
                            message TEXT,
                            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (userId) REFERENCES user(id)
);
CREATE INDEX idx_notification_user ON notification(userId);

CREATE TABLE posts (
                     id INT AUTO_INCREMENT PRIMARY KEY,
                     user_id BIGINT,
                     content TEXT,
                     visibility ENUM('VISIBLE','HIDDEN') DEFAULT 'VISIBLE',
                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                     FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE TABLE ratings (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       user_id BIGINT,
                       post_id INT,
                       score TINYINT,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       FOREIGN KEY (user_id) REFERENCES user(id),
                       FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE TABLE comments (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        user_id BIGINT,
                        post_id INT,
                        content TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES user(id),
                        FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE TABLE reports (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       reported_by BIGINT,
                       comment_id BIGINT,
                       status ENUM('NEW','REVIEWED','CANCELLED') DEFAULT 'NEW',
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       FOREIGN KEY (reported_by) REFERENCES user(id),
                       FOREIGN KEY (comment_id) REFERENCES comments(id)
);

CREATE TABLE transaction (
                           id BIGINT PRIMARY KEY AUTO_INCREMENT,
                           fromUserId BIGINT,
                           toUserId BIGINT,
                           amount DECIMAL(12,2) NOT NULL,
                           type ENUM('hold','transfer','withdraw') NOT NULL,
                           status ENUM('pending','approved','disputed','completed') NOT NULL,
                           createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                           FOREIGN KEY (fromUserId) REFERENCES user(id),
                           FOREIGN KEY (toUserId) REFERENCES user(id)
);
CREATE INDEX idx_transaction_from ON transaction(fromUserId);
CREATE INDEX idx_transaction_to ON transaction(toUserId);
CREATE INDEX idx_transaction_status ON transaction(status);

CREATE TABLE category (
                        id BIGINT PRIMARY KEY AUTO_INCREMENT,
                        name VARCHAR(100) NOT NULL UNIQUE,
                        description TEXT,
                        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);






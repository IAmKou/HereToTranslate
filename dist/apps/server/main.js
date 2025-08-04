/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("tslib");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("@nestjs/common");

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("@nestjs/core");

/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MainModule = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(5);
const class_transformer_1 = __webpack_require__(6);
const class_validator_1 = __webpack_require__(7);
const env_schema_1 = __webpack_require__(8);
const db_module_1 = __webpack_require__(9);
const auth_module_1 = __webpack_require__(43);
const seeder_module_1 = __webpack_require__(75);
const managers_module_1 = __webpack_require__(77);
const json_serializer_interceptor_1 = __webpack_require__(110);
const mailer_1 = __webpack_require__(49);
const handlebars_adapter_1 = __webpack_require__(159);
const path = tslib_1.__importStar(__webpack_require__(103));
const chat_module_1 = __webpack_require__(160);
let MainModule = class MainModule {
};
exports.MainModule = MainModule;
exports.MainModule = MainModule = tslib_1.__decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validate(config) {
                    const instance = (0, class_transformer_1.plainToInstance)(env_schema_1.EnvConfigs, config, { enableImplicitConversion: true });
                    const errors = (0, class_validator_1.validateSync)(instance, { skipMissingProperties: false });
                    if (errors.length > 0) {
                        throw new Error(errors.toString());
                    }
                    return instance;
                },
            }),
            mailer_1.MailerModule.forRoot({
                transport: {
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    auth: {
                        user: 'csgit47@gmail.com',
                        pass: 'svvuwvdjrbiucehn',
                    },
                },
                defaults: {
                    from: '"Here To Translate Support" <csgit47@gmail.com>',
                },
                template: {
                    dir: path.join(__dirname, 'mailer', 'templates'),
                    adapter: new handlebars_adapter_1.HandlebarsAdapter(),
                    options: {
                        strict: true,
                    },
                },
            }),
            db_module_1.DbContextModule,
            seeder_module_1.SeederModule,
            auth_module_1.AuthModule,
            managers_module_1.ManagersModule,
            chat_module_1.ChatModule
        ],
        controllers: [],
        providers: [
            json_serializer_interceptor_1.JsonSerializerInterceptor
        ],
    })
], MainModule);


/***/ }),
/* 5 */
/***/ ((module) => {

module.exports = require("@nestjs/config");

/***/ }),
/* 6 */
/***/ ((module) => {

module.exports = require("class-transformer");

/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = require("class-validator");

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EnvConfigs = void 0;
const tslib_1 = __webpack_require__(1);
const class_validator_1 = __webpack_require__(7);
class EnvConfigs {
    constructor() {
        this.JWT_EXPIRATION = "1h";
        this.ACCESS_TOKEN_EXPIRY = "1h";
        this.REFRESH_TOKEN_EXPIRY = "7d";
    }
}
exports.EnvConfigs = EnvConfigs;
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], EnvConfigs.prototype, "MYSQL_HOST", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(65535),
    tslib_1.__metadata("design:type", Number)
], EnvConfigs.prototype, "MYSQL_PORT", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], EnvConfigs.prototype, "MYSQL_USER", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], EnvConfigs.prototype, "MYSQL_PASSWORD", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], EnvConfigs.prototype, "MYSQL_DATABASE", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], EnvConfigs.prototype, "MONGODB_URI", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], EnvConfigs.prototype, "MONGODB_DB", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], EnvConfigs.prototype, "JWT_SECRET", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", Object)
], EnvConfigs.prototype, "JWT_EXPIRATION", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], EnvConfigs.prototype, "GOOGLE_OAUTH2_CLIENT", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", Object)
], EnvConfigs.prototype, "ACCESS_TOKEN_EXPIRY", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", Object)
], EnvConfigs.prototype, "REFRESH_TOKEN_EXPIRY", void 0);


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DbContextModule = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const config_1 = __webpack_require__(5);
const dbcontext_service_1 = __webpack_require__(11);
const mysql_connection_1 = __webpack_require__(14);
const mongo_connection_1 = __webpack_require__(12);
const mongoose_1 = __webpack_require__(41);
const mongoose_2 = __webpack_require__(42);
let DbContextModule = class DbContextModule {
};
exports.DbContextModule = DbContextModule;
exports.DbContextModule = DbContextModule = tslib_1.__decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => {
                    const mysqlConnection = new mysql_connection_1.MySqlConnection(configService);
                    await mysqlConnection.init();
                    return mysqlConnection.dataSource.options;
                }
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const logger = new common_1.Logger('MongooseModule');
                    return ({
                        useBigInt64: true,
                        ssl: true,
                        onConnectionCreate(connection) {
                            const { readyState } = connection;
                            connection.on('connected', c => logger.log(c));
                            logger.log(`Connection created: [${mongoose_2.ConnectionStates[readyState]}`);
                            return connection;
                        },
                        connectionErrorFactory(error) {
                            logger.error(`MongoDB connection error: ${error.message}`);
                            return error;
                        },
                        uri: configService.get('MONGODB_URI'),
                        dbName: configService.get('MONGODB_DB'),
                    });
                }
            })
        ],
        providers: [dbcontext_service_1.DbContextService, mysql_connection_1.MySqlConnection, mongo_connection_1.MongoDbConnection],
        exports: [dbcontext_service_1.DbContextService, typeorm_1.TypeOrmModule, mongoose_1.MongooseModule]
    })
], DbContextModule);


/***/ }),
/* 10 */
/***/ ((module) => {

module.exports = require("@nestjs/typeorm");

/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var DbContextService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DbContextService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const mongo_connection_1 = __webpack_require__(12);
const mysql_connection_1 = __webpack_require__(14);
let DbContextService = DbContextService_1 = class DbContextService {
    constructor(mongoDb, mySqlDb) {
        this.mongoDb = mongoDb;
        this.mySqlDb = mySqlDb;
        this.logger = new common_1.Logger(DbContextService_1.name);
    }
    // Automatically called when the NestJS module is initialized
    async onModuleInit() {
        this.logger.log('DbContextService initialized successfully.');
    }
    // Automatically called when the NestJS module is shutting down
    async onModuleDestroy() {
        this.logger.log('DbContextService shutting down...');
        await Promise.all([
            this.mongoDb.close(), // Close MongoDB connection
            this.mySqlDb.close(), // Close MySQL connection
        ]);
        this.logger.log('DbContextService shut down successfully.');
    }
    // Getter for MongoDB
    get mongo() {
        return this.mongoDb.getDb();
    }
    // Getter for MySQL
    get mysql() {
        return this.mySqlDb.dataSource;
    }
    // Manual reconnect function for all databases
    async reconnectAll() {
        this.logger.warn('Reconnecting all databases...');
        await Promise.all([
            this.mongoDb.reconnect(),
            this.mySqlDb.reconnect(),
        ]);
        this.logger.log('All databases reconnected successfully.');
    }
};
exports.DbContextService = DbContextService;
exports.DbContextService = DbContextService = DbContextService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof mongo_connection_1.MongoDbConnection !== "undefined" && mongo_connection_1.MongoDbConnection) === "function" ? _a : Object, typeof (_b = typeof mysql_connection_1.MySqlConnection !== "undefined" && mysql_connection_1.MySqlConnection) === "function" ? _b : Object])
], DbContextService);


/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var MongoDbConnection_1;
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MongoDbConnection = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const mongodb_1 = __webpack_require__(13);
const config_1 = __webpack_require__(5);
let MongoDbConnection = MongoDbConnection_1 = class MongoDbConnection {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(MongoDbConnection_1.name);
        if (MongoDbConnection_1.instance)
            return MongoDbConnection_1.instance;
        MongoDbConnection_1.instance = this;
    }
    async init() {
        const uri = this.config.get('MONGODB_URI');
        if (typeof uri === 'string') {
            this.client = new mongodb_1.MongoClient(uri);
        }
        await this.client.connect();
        const dbName = this.config.get('MONGODB_DB');
        this.db = this.client.db(dbName);
        this.logger.log(`Connected to MongoDB database: ${dbName}`);
    }
    // Get the Mongo database instance
    getDb() {
        return this.db;
    }
    // Close the MongoDB connection
    async close() {
        await this.client.close();
        this.logger.log('MongoDB connection closed');
    }
    // Reconnect to MongoDB
    async reconnect() {
        await this.close();
        await this.init();
        this.logger.log('MongoDB reconnected');
    }
};
exports.MongoDbConnection = MongoDbConnection;
exports.MongoDbConnection = MongoDbConnection = MongoDbConnection_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], MongoDbConnection);


/***/ }),
/* 13 */
/***/ ((module) => {

module.exports = require("mongodb");

/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var MySqlConnection_1;
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MySqlConnection = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(15);
const config_1 = __webpack_require__(5);
const Entities_1 = __webpack_require__(16);
let MySqlConnection = MySqlConnection_1 = class MySqlConnection {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(MySqlConnection_1.name);
        MySqlConnection_1.instance = this;
        this._dataSource = new typeorm_1.DataSource({
            type: 'mysql',
            host: this.config.get('MYSQL_HOST'),
            port: this.config.get('MYSQL_PORT'),
            username: this.config.get('MYSQL_USER'),
            password: this.config.get('MYSQL_PASSWORD'),
            database: this.config.get('MYSQL_DATABASE'),
            ssl: {
                rejectUnauthorized: false,
            },
            synchronize: true,
            logging: true,
            supportBigNumbers: true,
            charset: 'utf8mb4_unicode_ci',
            entities: [
                Entities_1.UserEntity,
                Entities_1.BranchEntity,
                Entities_1.ProjectEntity,
                Entities_1.CategoryEntity,
                Entities_1.FileEntity,
                Entities_1.ProjectGroupEntity,
                Entities_1.ProjectRoleEntity,
                Entities_1.ProjectInvitationEntity,
                Entities_1.ReportEntity,
                Entities_1.RequestEntity,
                Entities_1.TaskEntity,
                Entities_1.TransactionEntity,
                Entities_1.CommitEntity,
                Entities_1.ProjectTagEntity,
                Entities_1.ProjectDiscussionCommentEntity,
                Entities_1.ProjectDiscussionThreadEntity,
                Entities_1.DiscussionAccessPolicyEntity,
                Entities_1.UserTypeEntity,
                Entities_1.TranslationApprovalEntity,
                Entities_1.WalletEntity,
                Entities_1.NotificationEntity,
                Entities_1.SettingsEntity,
                Entities_1.AuthTokenEntity,
            ],
        });
        MySqlConnection_1.instance = this;
    }
    // Init MySQL connection
    async init() {
        try {
            await this.dataSource.initialize();
            this.logger.log('Connected to MySQL database');
        }
        catch (error) {
            this.logger.error('Error connecting to MySQL database', error);
        }
    }
    // Get the MySQL DataSource instance
    get dataSource() {
        return this._dataSource;
    }
    // Close the MySQL connection
    async close() {
        await this.dataSource.destroy();
        this.logger.log('MySQL connection closed');
    }
    // Reconnect to MySQL
    async reconnect() {
        await this.close();
        await this.init();
        this.logger.log('MySQL reconnected');
    }
};
exports.MySqlConnection = MySqlConnection;
exports.MySqlConnection = MySqlConnection = MySqlConnection_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], MySqlConnection);


/***/ }),
/* 15 */
/***/ ((module) => {

module.exports = require("typeorm");

/***/ }),
/* 16 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(1);
tslib_1.__exportStar(__webpack_require__(17), exports);
tslib_1.__exportStar(__webpack_require__(26), exports);
tslib_1.__exportStar(__webpack_require__(23), exports);
tslib_1.__exportStar(__webpack_require__(24), exports);
tslib_1.__exportStar(__webpack_require__(32), exports);
tslib_1.__exportStar(__webpack_require__(18), exports);
tslib_1.__exportStar(__webpack_require__(30), exports);
tslib_1.__exportStar(__webpack_require__(28), exports);
tslib_1.__exportStar(__webpack_require__(33), exports);
tslib_1.__exportStar(__webpack_require__(20), exports);
tslib_1.__exportStar(__webpack_require__(27), exports);
tslib_1.__exportStar(__webpack_require__(34), exports);
tslib_1.__exportStar(__webpack_require__(25), exports);
tslib_1.__exportStar(__webpack_require__(35), exports);
tslib_1.__exportStar(__webpack_require__(29), exports);
tslib_1.__exportStar(__webpack_require__(36), exports);
tslib_1.__exportStar(__webpack_require__(37), exports);
tslib_1.__exportStar(__webpack_require__(19), exports);
tslib_1.__exportStar(__webpack_require__(38), exports);
tslib_1.__exportStar(__webpack_require__(39), exports);
tslib_1.__exportStar(__webpack_require__(40), exports);
tslib_1.__exportStar(__webpack_require__(31), exports);


/***/ }),
/* 17 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BranchEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const project_entity_1 = __webpack_require__(18);
const user_entity_1 = __webpack_require__(19);
const commit_entity_1 = __webpack_require__(23);
const file_entity_1 = __webpack_require__(24);
const project_role_entity_1 = __webpack_require__(20);
let BranchEntity = class BranchEntity {
};
exports.BranchEntity = BranchEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], BranchEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.ProjectEntity, project => project.id, { nullable: false, onDelete: 'CASCADE' }),
    tslib_1.__metadata("design:type", typeof (_a = typeof project_entity_1.ProjectEntity !== "undefined" && project_entity_1.ProjectEntity) === "function" ? _a : Object)
], BranchEntity.prototype, "project", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    tslib_1.__metadata("design:type", String)
], BranchEntity.prototype, "name", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, user => user.id, { nullable: false, onDelete: 'CASCADE' }),
    tslib_1.__metadata("design:type", typeof (_b = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _b : Object)
], BranchEntity.prototype, "user", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], BranchEntity.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => commit_entity_1.CommitEntity, commit => commit.branch),
    tslib_1.__metadata("design:type", Array)
], BranchEntity.prototype, "commits", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => file_entity_1.FileEntity, file => file.branch),
    tslib_1.__metadata("design:type", Array)
], BranchEntity.prototype, "files", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => project_role_entity_1.ProjectRoleEntity, { cascade: true }),
    (0, typeorm_1.JoinTable)({
        name: 'branch_visible_roles',
        joinColumn: { name: 'branchId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
    }),
    tslib_1.__metadata("design:type", Array)
], BranchEntity.prototype, "visibleToRoles", void 0);
exports.BranchEntity = BranchEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('branches')
], BranchEntity);


/***/ }),
/* 18 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const user_entity_1 = __webpack_require__(19);
const project_role_entity_1 = __webpack_require__(20);
const project_group_entity_1 = __webpack_require__(28);
const branch_entity_1 = __webpack_require__(17);
const commit_entity_1 = __webpack_require__(23);
const file_entity_1 = __webpack_require__(24);
const category_entity_1 = __webpack_require__(26);
const project_tag_entity_1 = __webpack_require__(27);
const project_discussion_entity_1 = __webpack_require__(30);
let ProjectEntity = class ProjectEntity {
};
exports.ProjectEntity = ProjectEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], ProjectEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)(),
    tslib_1.__metadata("design:type", String)
], ProjectEntity.prototype, "name", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    tslib_1.__metadata("design:type", String)
], ProjectEntity.prototype, "description", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    tslib_1.__metadata("design:type", Boolean)
], ProjectEntity.prototype, "isPrivate", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    tslib_1.__metadata("design:type", Array)
], ProjectEntity.prototype, "targetLanguages", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, user => user.createdProjects),
    tslib_1.__metadata("design:type", typeof (_a = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _a : Object)
], ProjectEntity.prototype, "createdBy", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], ProjectEntity.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => project_role_entity_1.ProjectRoleEntity, projectRole => projectRole.project, {
        cascade: true,
        onDelete: 'CASCADE',
    }),
    tslib_1.__metadata("design:type", Array)
], ProjectEntity.prototype, "projectRoles", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => project_group_entity_1.ProjectGroupEntity, group => group.project, {
        cascade: true,
        onDelete: 'CASCADE',
    }),
    tslib_1.__metadata("design:type", Array)
], ProjectEntity.prototype, "groups", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => branch_entity_1.BranchEntity, branch => branch.project),
    tslib_1.__metadata("design:type", Array)
], ProjectEntity.prototype, "branches", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => branch_entity_1.BranchEntity, { nullable: true, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'defaultBranchId' }),
    tslib_1.__metadata("design:type", typeof (_c = typeof branch_entity_1.BranchEntity !== "undefined" && branch_entity_1.BranchEntity) === "function" ? _c : Object)
], ProjectEntity.prototype, "defaultBranch", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => commit_entity_1.CommitEntity, commit => commit.project),
    tslib_1.__metadata("design:type", Array)
], ProjectEntity.prototype, "commits", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => project_discussion_entity_1.ProjectDiscussionThreadEntity, thread => thread.project),
    tslib_1.__metadata("design:type", Array)
], ProjectEntity.prototype, "discussions", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => file_entity_1.FileEntity, file => file.project),
    tslib_1.__metadata("design:type", Array)
], ProjectEntity.prototype, "file", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => category_entity_1.CategoryEntity, category => category.id),
    tslib_1.__metadata("design:type", typeof (_d = typeof category_entity_1.CategoryEntity !== "undefined" && category_entity_1.CategoryEntity) === "function" ? _d : Object)
], ProjectEntity.prototype, "category", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => user_entity_1.UserEntity, user => user.projects),
    (0, typeorm_1.JoinTable)({
        joinColumn: { name: 'projectId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
    }),
    tslib_1.__metadata("design:type", Array)
], ProjectEntity.prototype, "members", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => project_tag_entity_1.ProjectTagEntity, { cascade: true }),
    (0, typeorm_1.JoinTable)({
        joinColumn: { name: 'projectId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
    }),
    tslib_1.__metadata("design:type", Array)
], ProjectEntity.prototype, "tags", void 0);
exports.ProjectEntity = ProjectEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('project')
], ProjectEntity);


/***/ }),
/* 19 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserEntity = exports.UserRole = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const project_entity_1 = __webpack_require__(18);
const project_role_entity_1 = __webpack_require__(20);
const branch_entity_1 = __webpack_require__(17);
const commit_entity_1 = __webpack_require__(23);
const file_entity_1 = __webpack_require__(24);
const project_group_entity_1 = __webpack_require__(28);
const user_type_entity_1 = __webpack_require__(29);
const request_entity_1 = __webpack_require__(25);
const project_discussion_entity_1 = __webpack_require__(30);
const auth_token_entity_1 = __webpack_require__(31);
var UserRole;
(function (UserRole) {
    UserRole[UserRole["SuperAdmin"] = 1] = "SuperAdmin";
    UserRole[UserRole["Admin"] = 2] = "Admin";
    UserRole[UserRole["Member"] = 3] = "Member";
})(UserRole || (exports.UserRole = UserRole = {}));
let UserEntity = class UserEntity {
};
exports.UserEntity = UserEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], UserEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 50 }),
    tslib_1.__metadata("design:type", String)
], UserEntity.prototype, "username", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 100 }),
    tslib_1.__metadata("design:type", String)
], UserEntity.prototype, "email", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    tslib_1.__metadata("design:type", String)
], UserEntity.prototype, "passwordHash", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 50 }),
    tslib_1.__metadata("design:type", String)
], UserEntity.prototype, "phone", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    tslib_1.__metadata("design:type", String)
], UserEntity.prototype, "fullName", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    tslib_1.__metadata("design:type", String)
], UserEntity.prototype, "avatarUrl", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_type_entity_1.UserTypeEntity, (role) => role.users),
    (0, typeorm_1.JoinColumn)({ name: 'roleId' }),
    tslib_1.__metadata("design:type", typeof (_a = typeof user_type_entity_1.UserTypeEntity !== "undefined" && user_type_entity_1.UserTypeEntity) === "function" ? _a : Object)
], UserEntity.prototype, "role", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ default: true }),
    tslib_1.__metadata("design:type", Boolean)
], UserEntity.prototype, "isActive", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], UserEntity.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => project_entity_1.ProjectEntity, (project) => project.createdBy),
    tslib_1.__metadata("design:type", Array)
], UserEntity.prototype, "createdProjects", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => project_role_entity_1.ProjectRoleEntity, (projectRole) => projectRole.users),
    tslib_1.__metadata("design:type", Array)
], UserEntity.prototype, "projectRoles", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => project_entity_1.ProjectEntity, (project) => project.members, {
        cascade: true,
    }),
    tslib_1.__metadata("design:type", Array)
], UserEntity.prototype, "projects", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => project_group_entity_1.ProjectGroupEntity, (group) => group.members, {
        cascade: true,
    }),
    tslib_1.__metadata("design:type", Array)
], UserEntity.prototype, "groups", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => branch_entity_1.BranchEntity, (branch) => branch.user),
    tslib_1.__metadata("design:type", Array)
], UserEntity.prototype, "branch", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => commit_entity_1.CommitEntity, (commit) => commit.author),
    tslib_1.__metadata("design:type", Array)
], UserEntity.prototype, "commit", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => file_entity_1.FileEntity, (file) => file.uploader),
    tslib_1.__metadata("design:type", Array)
], UserEntity.prototype, "file", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => request_entity_1.RequestEntity, (request) => request.registrants),
    tslib_1.__metadata("design:type", Array)
], UserEntity.prototype, "registeredRequests", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => project_discussion_entity_1.ProjectDiscussionCommentEntity, (upvote) => upvote.upvotes, { cascade: true }),
    tslib_1.__metadata("design:type", Array)
], UserEntity.prototype, "upvote", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => project_discussion_entity_1.ProjectDiscussionCommentEntity, (downvote) => downvote.downvotes, { cascade: true }),
    tslib_1.__metadata("design:type", Array)
], UserEntity.prototype, "downvote", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToOne)(() => auth_token_entity_1.AuthTokenEntity, (authToken) => authToken.user),
    tslib_1.__metadata("design:type", Array)
], UserEntity.prototype, "authTokens", void 0);
exports.UserEntity = UserEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('user')
], UserEntity);


/***/ }),
/* 20 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectRoleEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const user_entity_1 = __webpack_require__(19);
const project_entity_1 = __webpack_require__(18);
const common_1 = __webpack_require__(21);
const typeorm_extensions_1 = __webpack_require__(22);
const branch_entity_1 = __webpack_require__(17);
let ProjectRoleEntity = class ProjectRoleEntity {
};
exports.ProjectRoleEntity = ProjectRoleEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], ProjectRoleEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.ProjectEntity, project => project.projectRoles, {
        onDelete: 'CASCADE',
    }),
    tslib_1.__metadata("design:type", typeof (_a = typeof project_entity_1.ProjectEntity !== "undefined" && project_entity_1.ProjectEntity) === "function" ? _a : Object)
], ProjectRoleEntity.prototype, "project", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => user_entity_1.UserEntity, user => user.projectRoles, { cascade: true }),
    (0, typeorm_1.JoinTable)({
        name: 'user_project_roles',
        joinColumn: { name: 'roleId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
    }),
    tslib_1.__metadata("design:type", Array)
], ProjectRoleEntity.prototype, "users", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 32 }),
    tslib_1.__metadata("design:type", String)
], ProjectRoleEntity.prototype, "name", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({
        type: 'bigint',
        unsigned: true,
        default: common_1.PermissionFlags.None,
        transformer: (0, typeorm_extensions_1.BigIntColumnTransformer)(common_1.Permission)
    }),
    tslib_1.__metadata("design:type", typeof (_b = typeof common_1.Permission !== "undefined" && common_1.Permission) === "function" ? _b : Object)
], ProjectRoleEntity.prototype, "permissionFlags", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => branch_entity_1.BranchEntity, branch => branch.visibleToRoles),
    tslib_1.__metadata("design:type", typeof (_c = typeof branch_entity_1.BranchEntity !== "undefined" && branch_entity_1.BranchEntity) === "function" ? _c : Object)
], ProjectRoleEntity.prototype, "branch", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], ProjectRoleEntity.prototype, "createdAt", void 0);
exports.ProjectRoleEntity = ProjectRoleEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('projectrole')
], ProjectRoleEntity);


/***/ }),
/* 21 */
/***/ ((module) => {

module.exports = require("@here-to-translate/common");

/***/ }),
/* 22 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BigIntColumnTransformer = BigIntColumnTransformer;
function BigIntColumnTransformer(cls) {
    return {
        from: (value) => {
            if (typeof value === 'object' && value !== null && value instanceof cls) {
                return value;
            }
            if (typeof value === "bigint" || typeof value === "string" || typeof value === "number") {
                return new cls(BigInt(value));
            }
            throw new TypeError("Value must be a bigint, string, number or instance of the specified class.");
        },
        to: (value) => {
            if (typeof value === 'object' && value !== null && value instanceof cls) {
                return value.toBigInt();
            }
            throw new TypeError("Value must be an instance of the specified class.");
        }
    };
}


/***/ }),
/* 23 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CommitEntity = exports.CommitStatus = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const branch_entity_1 = __webpack_require__(17);
const project_entity_1 = __webpack_require__(18);
const user_entity_1 = __webpack_require__(19);
var CommitStatus;
(function (CommitStatus) {
    CommitStatus["Pending"] = "pending";
    CommitStatus["Approved"] = "approved";
    CommitStatus["Rejected"] = "rejected";
})(CommitStatus || (exports.CommitStatus = CommitStatus = {}));
let CommitEntity = class CommitEntity {
};
exports.CommitEntity = CommitEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], CommitEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => branch_entity_1.BranchEntity, branch => branch.commits, {
        nullable: false,
        onDelete: 'CASCADE',
    }),
    tslib_1.__metadata("design:type", typeof (_a = typeof branch_entity_1.BranchEntity !== "undefined" && branch_entity_1.BranchEntity) === "function" ? _a : Object)
], CommitEntity.prototype, "branch", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.ProjectEntity, {
        nullable: true,
        onDelete: 'SET NULL',
    }),
    tslib_1.__metadata("design:type", typeof (_b = typeof project_entity_1.ProjectEntity !== "undefined" && project_entity_1.ProjectEntity) === "function" ? _b : Object)
], CommitEntity.prototype, "project", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, user => user.id, {
        nullable: false,
        onDelete: 'CASCADE',
    }),
    tslib_1.__metadata("design:type", typeof (_c = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _c : Object)
], CommitEntity.prototype, "author", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    tslib_1.__metadata("design:type", String)
], CommitEntity.prototype, "message", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'content_snapshot', nullable: true }),
    tslib_1.__metadata("design:type", String)
], CommitEntity.prototype, "contentSnapshot", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    tslib_1.__metadata("design:type", String)
], CommitEntity.prototype, "filePath", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: CommitStatus,
        default: CommitStatus.Pending,
    }),
    tslib_1.__metadata("design:type", String)
], CommitEntity.prototype, "status", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true }),
    tslib_1.__metadata("design:type", BigInt)
], CommitEntity.prototype, "reviewedByUserId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    tslib_1.__metadata("design:type", String)
], CommitEntity.prototype, "reviewMessage", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], CommitEntity.prototype, "createdAt", void 0);
exports.CommitEntity = CommitEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('commits')
], CommitEntity);


/***/ }),
/* 24 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f, _g, _h;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FileEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const project_entity_1 = __webpack_require__(18);
const branch_entity_1 = __webpack_require__(17);
const user_entity_1 = __webpack_require__(19);
const request_entity_1 = __webpack_require__(25);
let FileEntity = class FileEntity {
};
exports.FileEntity = FileEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], FileEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.ProjectEntity, { nullable: true, onDelete: 'CASCADE' }),
    tslib_1.__metadata("design:type", typeof (_a = typeof project_entity_1.ProjectEntity !== "undefined" && project_entity_1.ProjectEntity) === "function" ? _a : Object)
], FileEntity.prototype, "project", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => branch_entity_1.BranchEntity, { nullable: true, onDelete: 'CASCADE' }),
    tslib_1.__metadata("design:type", typeof (_b = typeof branch_entity_1.BranchEntity !== "undefined" && branch_entity_1.BranchEntity) === "function" ? _b : Object)
], FileEntity.prototype, "branch", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { nullable: false, onDelete: 'CASCADE' }),
    tslib_1.__metadata("design:type", typeof (_c = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _c : Object)
], FileEntity.prototype, "uploader", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' }),
    tslib_1.__metadata("design:type", String)
], FileEntity.prototype, "fileName", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    tslib_1.__metadata("design:type", String)
], FileEntity.prototype, "fileType", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'longblob', nullable: true }),
    tslib_1.__metadata("design:type", typeof (_d = typeof Buffer !== "undefined" && Buffer) === "function" ? _d : Object)
], FileEntity.prototype, "fileContent", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'longblob', nullable: true }),
    tslib_1.__metadata("design:type", typeof (_e = typeof Buffer !== "undefined" && Buffer) === "function" ? _e : Object)
], FileEntity.prototype, "compiledContent", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    tslib_1.__metadata("design:type", String)
], FileEntity.prototype, "extractLog", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'ready', nullable: true }),
    tslib_1.__metadata("design:type", String)
], FileEntity.prototype, "status", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_f = typeof Date !== "undefined" && Date) === "function" ? _f : Object)
], FileEntity.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_g = typeof Date !== "undefined" && Date) === "function" ? _g : Object)
], FileEntity.prototype, "updatedAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => request_entity_1.RequestEntity, { nullable: true }),
    tslib_1.__metadata("design:type", typeof (_h = typeof request_entity_1.RequestEntity !== "undefined" && request_entity_1.RequestEntity) === "function" ? _h : Object)
], FileEntity.prototype, "request", void 0);
exports.FileEntity = FileEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('file')
], FileEntity);


/***/ }),
/* 25 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RequestEntity = exports.RequestStatus = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const user_entity_1 = __webpack_require__(19);
const project_entity_1 = __webpack_require__(18);
const category_entity_1 = __webpack_require__(26);
const project_tag_entity_1 = __webpack_require__(27);
const file_entity_1 = __webpack_require__(24);
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["Cancelled"] = "CANCELLED";
    RequestStatus["Pending"] = "PENDING";
    RequestStatus["Approved"] = "APPROVED";
    RequestStatus["Rejected"] = "REJECTED";
    RequestStatus["Completed"] = "COMPLETED";
    RequestStatus["DeliveryPending"] = "DELIVERYPENDING";
    RequestStatus["Failed"] = "FAILED";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
let RequestEntity = class RequestEntity {
};
exports.RequestEntity = RequestEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], RequestEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'requesterId' }),
    tslib_1.__metadata("design:type", typeof (_a = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _a : Object)
], RequestEntity.prototype, "requester", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.ProjectEntity, { nullable: true, onDelete: 'SET NULL' }),
    tslib_1.__metadata("design:type", typeof (_b = typeof project_entity_1.ProjectEntity !== "undefined" && project_entity_1.ProjectEntity) === "function" ? _b : Object)
], RequestEntity.prototype, "project", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => user_entity_1.UserEntity),
    (0, typeorm_1.JoinTable)({
        name: 'request_registrants',
        joinColumn: { name: 'request_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
    }),
    tslib_1.__metadata("design:type", Array)
], RequestEntity.prototype, "registrants", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    tslib_1.__metadata("design:type", String)
], RequestEntity.prototype, "title", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    tslib_1.__metadata("design:type", String)
], RequestEntity.prototype, "description", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    tslib_1.__metadata("design:type", Number)
], RequestEntity.prototype, "dealAmount", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    tslib_1.__metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], RequestEntity.prototype, "deadline", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: RequestStatus, default: RequestStatus.Pending }),
    tslib_1.__metadata("design:type", String)
], RequestEntity.prototype, "status", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], RequestEntity.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)(),
    tslib_1.__metadata("design:type", Boolean)
], RequestEntity.prototype, "isPublic", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => category_entity_1.CategoryEntity, { nullable: true, onDelete: 'SET NULL' }),
    tslib_1.__metadata("design:type", typeof (_e = typeof category_entity_1.CategoryEntity !== "undefined" && category_entity_1.CategoryEntity) === "function" ? _e : Object)
], RequestEntity.prototype, "category", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { nullable: true, onDelete: 'SET NULL' }),
    tslib_1.__metadata("design:type", typeof (_f = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _f : Object)
], RequestEntity.prototype, "assignee", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => project_tag_entity_1.ProjectTagEntity, { cascade: true }),
    (0, typeorm_1.JoinTable)({
        joinColumn: { name: 'requestId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
    }),
    tslib_1.__metadata("design:type", Array)
], RequestEntity.prototype, "tags", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => file_entity_1.FileEntity, file => file.request, {
        cascade: true
    }),
    tslib_1.__metadata("design:type", Array)
], RequestEntity.prototype, "files", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    tslib_1.__metadata("design:type", Array)
], RequestEntity.prototype, "targetLanguages", void 0);
exports.RequestEntity = RequestEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('requests')
], RequestEntity);


/***/ }),
/* 26 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CategoryEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
let CategoryEntity = class CategoryEntity {
};
exports.CategoryEntity = CategoryEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], CategoryEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    tslib_1.__metadata("design:type", String)
], CategoryEntity.prototype, "name", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    tslib_1.__metadata("design:type", String)
], CategoryEntity.prototype, "description", void 0);
tslib_1.__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], CategoryEntity.prototype, "updatedAt", void 0);
exports.CategoryEntity = CategoryEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('category')
], CategoryEntity);


/***/ }),
/* 27 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectTagEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const project_entity_1 = __webpack_require__(18);
let ProjectTagEntity = class ProjectTagEntity {
};
exports.ProjectTagEntity = ProjectTagEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], ProjectTagEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    tslib_1.__metadata("design:type", String)
], ProjectTagEntity.prototype, "name", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => project_entity_1.ProjectEntity, project => project.tags, {}),
    tslib_1.__metadata("design:type", Array)
], ProjectTagEntity.prototype, "projects", void 0);
exports.ProjectTagEntity = ProjectTagEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('projecttag')
], ProjectTagEntity);


/***/ }),
/* 28 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectGroupEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const project_entity_1 = __webpack_require__(18);
const user_entity_1 = __webpack_require__(19);
let ProjectGroupEntity = class ProjectGroupEntity {
};
exports.ProjectGroupEntity = ProjectGroupEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], ProjectGroupEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    tslib_1.__metadata("design:type", String)
], ProjectGroupEntity.prototype, "name", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.ProjectEntity, project => project.groups, {
        onDelete: 'CASCADE',
    }),
    tslib_1.__metadata("design:type", typeof (_a = typeof project_entity_1.ProjectEntity !== "undefined" && project_entity_1.ProjectEntity) === "function" ? _a : Object)
], ProjectGroupEntity.prototype, "project", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => user_entity_1.UserEntity, user => user.groups),
    (0, typeorm_1.JoinTable)({
        joinColumn: { name: 'groupId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
    }),
    tslib_1.__metadata("design:type", Array)
], ProjectGroupEntity.prototype, "members", void 0);
exports.ProjectGroupEntity = ProjectGroupEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('projectgroup')
], ProjectGroupEntity);


/***/ }),
/* 29 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserTypeEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const user_entity_1 = __webpack_require__(19);
let UserTypeEntity = class UserTypeEntity {
};
exports.UserTypeEntity = UserTypeEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", String)
], UserTypeEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)(),
    tslib_1.__metadata("design:type", String)
], UserTypeEntity.prototype, "name", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => user_entity_1.UserEntity, user => user.role),
    tslib_1.__metadata("design:type", Array)
], UserTypeEntity.prototype, "users", void 0);
exports.UserTypeEntity = UserTypeEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('usertype')
], UserTypeEntity);


/***/ }),
/* 30 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DiscussionAccessPolicyEntity = exports.ProjectDiscussionCommentEntity = exports.ProjectDiscussionThreadEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const project_role_entity_1 = __webpack_require__(20);
const typeorm_extensions_1 = __webpack_require__(22);
const common_1 = __webpack_require__(21);
const project_entity_1 = __webpack_require__(18);
const user_entity_1 = __webpack_require__(19);
let ProjectDiscussionThreadEntity = class ProjectDiscussionThreadEntity {
};
exports.ProjectDiscussionThreadEntity = ProjectDiscussionThreadEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], ProjectDiscussionThreadEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.ProjectEntity, project => project.discussions, { onDelete: 'CASCADE' }),
    tslib_1.__metadata("design:type", typeof (_a = typeof project_entity_1.ProjectEntity !== "undefined" && project_entity_1.ProjectEntity) === "function" ? _a : Object)
], ProjectDiscussionThreadEntity.prototype, "project", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'national varchar', length: 32 }),
    tslib_1.__metadata("design:type", String)
], ProjectDiscussionThreadEntity.prototype, "title", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    tslib_1.__metadata("design:type", String)
], ProjectDiscussionThreadEntity.prototype, "description", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    tslib_1.__metadata("design:type", Boolean)
], ProjectDiscussionThreadEntity.prototype, "isPinned", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    tslib_1.__metadata("design:type", Boolean)
], ProjectDiscussionThreadEntity.prototype, "isArchived", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => ProjectDiscussionCommentEntity, comment => comment.thread, { cascade: true }),
    tslib_1.__metadata("design:type", Array)
], ProjectDiscussionThreadEntity.prototype, "comments", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToMany)(() => DiscussionAccessPolicyEntity, policy => policy.thread, { cascade: true }),
    tslib_1.__metadata("design:type", Array)
], ProjectDiscussionThreadEntity.prototype, "accessPolicies", void 0);
exports.ProjectDiscussionThreadEntity = ProjectDiscussionThreadEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('threads')
], ProjectDiscussionThreadEntity);
let ProjectDiscussionCommentEntity = class ProjectDiscussionCommentEntity {
};
exports.ProjectDiscussionCommentEntity = ProjectDiscussionCommentEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], ProjectDiscussionCommentEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'CASCADE' }),
    tslib_1.__metadata("design:type", typeof (_b = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _b : Object)
], ProjectDiscussionCommentEntity.prototype, "author", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    tslib_1.__metadata("design:type", String)
], ProjectDiscussionCommentEntity.prototype, "content", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    tslib_1.__metadata("design:type", Boolean)
], ProjectDiscussionCommentEntity.prototype, "isEdited", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => ProjectDiscussionThreadEntity, thread => thread.comments),
    tslib_1.__metadata("design:type", ProjectDiscussionThreadEntity)
], ProjectDiscussionCommentEntity.prototype, "thread", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    tslib_1.__metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], ProjectDiscussionCommentEntity.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, default: null }),
    tslib_1.__metadata("design:type", Object)
], ProjectDiscussionCommentEntity.prototype, "editedAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => user_entity_1.UserEntity),
    (0, typeorm_1.JoinTable)(),
    tslib_1.__metadata("design:type", Array)
], ProjectDiscussionCommentEntity.prototype, "upvotes", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToMany)(() => user_entity_1.UserEntity),
    (0, typeorm_1.JoinTable)(),
    tslib_1.__metadata("design:type", Array)
], ProjectDiscussionCommentEntity.prototype, "downvotes", void 0);
exports.ProjectDiscussionCommentEntity = ProjectDiscussionCommentEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('comments'),
    (0, typeorm_1.Unique)(['thread'])
], ProjectDiscussionCommentEntity);
let DiscussionAccessPolicyEntity = class DiscussionAccessPolicyEntity {
};
exports.DiscussionAccessPolicyEntity = DiscussionAccessPolicyEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], DiscussionAccessPolicyEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => ProjectDiscussionThreadEntity, thread => thread.accessPolicies, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'threadId', referencedColumnName: 'id' }),
    tslib_1.__metadata("design:type", ProjectDiscussionThreadEntity)
], DiscussionAccessPolicyEntity.prototype, "thread", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => project_role_entity_1.ProjectRoleEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'roleId', referencedColumnName: 'id' }),
    tslib_1.__metadata("design:type", typeof (_e = typeof project_role_entity_1.ProjectRoleEntity !== "undefined" && project_role_entity_1.ProjectRoleEntity) === "function" ? _e : Object)
], DiscussionAccessPolicyEntity.prototype, "role", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({
        type: 'bigint',
        unsigned: true,
        default: common_1.PermissionFlags.None,
        transformer: (0, typeorm_extensions_1.BigIntColumnTransformer)(common_1.Permission)
    }),
    tslib_1.__metadata("design:type", typeof (_f = typeof common_1.Permission !== "undefined" && common_1.Permission) === "function" ? _f : Object)
], DiscussionAccessPolicyEntity.prototype, "denyOverrides", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({
        type: 'bigint',
        unsigned: true,
        default: common_1.PermissionFlags.None,
        transformer: (0, typeorm_extensions_1.BigIntColumnTransformer)(common_1.Permission)
    }),
    tslib_1.__metadata("design:type", typeof (_g = typeof common_1.Permission !== "undefined" && common_1.Permission) === "function" ? _g : Object)
], DiscussionAccessPolicyEntity.prototype, "allowOverrides", void 0);
exports.DiscussionAccessPolicyEntity = DiscussionAccessPolicyEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('thread_access_policies'),
    (0, typeorm_1.Unique)(['thread', 'role'])
], DiscussionAccessPolicyEntity);


/***/ }),
/* 31 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthTokenEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const user_entity_1 = __webpack_require__(19);
let AuthTokenEntity = class AuthTokenEntity {
};
exports.AuthTokenEntity = AuthTokenEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    tslib_1.__metadata("design:type", String)
], AuthTokenEntity.prototype, "sessionId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    (0, typeorm_1.Index)(),
    tslib_1.__metadata("design:type", BigInt)
], AuthTokenEntity.prototype, "userId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.UserEntity),
    (0, typeorm_1.JoinColumn)({ name: 'userId', referencedColumnName: 'id' }),
    tslib_1.__metadata("design:type", typeof (_a = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _a : Object)
], AuthTokenEntity.prototype, "user", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 2000 }),
    (0, typeorm_1.Index)(),
    tslib_1.__metadata("design:type", String)
], AuthTokenEntity.prototype, "accessToken", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 2000, nullable: true }),
    (0, typeorm_1.Index)(),
    tslib_1.__metadata("design:type", String)
], AuthTokenEntity.prototype, "refreshToken", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: false }),
    tslib_1.__metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], AuthTokenEntity.prototype, "accessTokenExpiresAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    tslib_1.__metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], AuthTokenEntity.prototype, "refreshTokenExpiresAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: false }),
    tslib_1.__metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], AuthTokenEntity.prototype, "lastActivityAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    tslib_1.__metadata("design:type", typeof (_e = typeof Date !== "undefined" && Date) === "function" ? _e : Object)
], AuthTokenEntity.prototype, "createdAt", void 0);
exports.AuthTokenEntity = AuthTokenEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('auth_tokens')
], AuthTokenEntity);


/***/ }),
/* 32 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NotificationEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const user_entity_1 = __webpack_require__(19);
let NotificationEntity = class NotificationEntity {
};
exports.NotificationEntity = NotificationEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], NotificationEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true, nullable: true }),
    tslib_1.__metadata("design:type", BigInt)
], NotificationEntity.prototype, "userId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    tslib_1.__metadata("design:type", String)
], NotificationEntity.prototype, "type", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    tslib_1.__metadata("design:type", String)
], NotificationEntity.prototype, "message", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    tslib_1.__metadata("design:type", Boolean)
], NotificationEntity.prototype, "isGlobal", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true, nullable: true }),
    tslib_1.__metadata("design:type", BigInt)
], NotificationEntity.prototype, "createdBy", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    tslib_1.__metadata("design:type", Boolean)
], NotificationEntity.prototype, "isRead", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    tslib_1.__metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], NotificationEntity.prototype, "readAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'datetime' }),
    tslib_1.__metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], NotificationEntity.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'datetime' }),
    tslib_1.__metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], NotificationEntity.prototype, "updatedAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    tslib_1.__metadata("design:type", typeof (_d = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _d : Object)
], NotificationEntity.prototype, "user", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'createdBy' }),
    tslib_1.__metadata("design:type", typeof (_e = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _e : Object)
], NotificationEntity.prototype, "creator", void 0);
exports.NotificationEntity = NotificationEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('notification')
], NotificationEntity);


/***/ }),
/* 33 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectInvitationEntity = exports.InvitationStatus = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const project_entity_1 = __webpack_require__(18);
const user_entity_1 = __webpack_require__(19);
var InvitationStatus;
(function (InvitationStatus) {
    InvitationStatus["PENDING"] = "pending";
    InvitationStatus["ACCEPTED"] = "accepted";
    InvitationStatus["DECLINED"] = "declined";
    InvitationStatus["EXPIRED"] = "expired";
})(InvitationStatus || (exports.InvitationStatus = InvitationStatus = {}));
let ProjectInvitationEntity = class ProjectInvitationEntity {
};
exports.ProjectInvitationEntity = ProjectInvitationEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], ProjectInvitationEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true, name: 'project_id' }),
    tslib_1.__metadata("design:type", BigInt)
], ProjectInvitationEntity.prototype, "projectId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true, name: 'invited_user_id' }),
    tslib_1.__metadata("design:type", BigInt)
], ProjectInvitationEntity.prototype, "invitedUserId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true, name: 'invited_by_user_id' }),
    tslib_1.__metadata("design:type", BigInt)
], ProjectInvitationEntity.prototype, "invitedByUserId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: InvitationStatus,
        default: InvitationStatus.PENDING
    }),
    tslib_1.__metadata("design:type", String)
], ProjectInvitationEntity.prototype, "status", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    tslib_1.__metadata("design:type", String)
], ProjectInvitationEntity.prototype, "message", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', name: 'expires_at' }),
    tslib_1.__metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], ProjectInvitationEntity.prototype, "expiresAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    tslib_1.__metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], ProjectInvitationEntity.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    tslib_1.__metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], ProjectInvitationEntity.prototype, "updatedAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.ProjectEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    tslib_1.__metadata("design:type", typeof (_d = typeof project_entity_1.ProjectEntity !== "undefined" && project_entity_1.ProjectEntity) === "function" ? _d : Object)
], ProjectInvitationEntity.prototype, "project", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'invited_user_id' }),
    tslib_1.__metadata("design:type", typeof (_e = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _e : Object)
], ProjectInvitationEntity.prototype, "invitedUser", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'invited_by_user_id' }),
    tslib_1.__metadata("design:type", typeof (_f = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _f : Object)
], ProjectInvitationEntity.prototype, "invitedByUser", void 0);
exports.ProjectInvitationEntity = ProjectInvitationEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('project_invitations'),
    (0, typeorm_1.Index)(['projectId', 'invitedUserId'], { unique: true }),
    (0, typeorm_1.Index)(['invitedUserId', 'status'])
], ProjectInvitationEntity);


/***/ }),
/* 34 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ReportEntity = exports.ReportStatus = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const user_entity_1 = __webpack_require__(19);
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["New"] = "NEW";
    ReportStatus["Reviewed"] = "REVIEWED";
    ReportStatus["Cancelled"] = "CANCELLED";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
let ReportEntity = class ReportEntity {
};
exports.ReportEntity = ReportEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], ReportEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'CASCADE' }),
    tslib_1.__metadata("design:type", typeof (_a = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _a : Object)
], ReportEntity.prototype, "reportedBy", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ReportStatus, default: ReportStatus.New }),
    tslib_1.__metadata("design:type", String)
], ReportEntity.prototype, "status", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], ReportEntity.prototype, "createdAt", void 0);
exports.ReportEntity = ReportEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('reports')
], ReportEntity);


/***/ }),
/* 35 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RequestRegistrationEntity = exports.RegistrationStatus = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const user_entity_1 = __webpack_require__(19);
const request_entity_1 = __webpack_require__(25);
var RegistrationStatus;
(function (RegistrationStatus) {
    RegistrationStatus["Pending"] = "PENDING";
    RegistrationStatus["Approved"] = "APPROVED";
    RegistrationStatus["Rejected"] = "REJECTED";
    RegistrationStatus["Cancelled"] = "CANCELLED";
})(RegistrationStatus || (exports.RegistrationStatus = RegistrationStatus = {}));
let RequestRegistrationEntity = class RequestRegistrationEntity {
};
exports.RequestRegistrationEntity = RequestRegistrationEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], RequestRegistrationEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => request_entity_1.RequestEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'request_id' }),
    tslib_1.__metadata("design:type", typeof (_a = typeof request_entity_1.RequestEntity !== "undefined" && request_entity_1.RequestEntity) === "function" ? _a : Object)
], RequestRegistrationEntity.prototype, "request", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    tslib_1.__metadata("design:type", typeof (_b = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _b : Object)
], RequestRegistrationEntity.prototype, "user", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: RegistrationStatus, default: RegistrationStatus.Pending }),
    tslib_1.__metadata("design:type", String)
], RequestRegistrationEntity.prototype, "status", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], RequestRegistrationEntity.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    tslib_1.__metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], RequestRegistrationEntity.prototype, "updatedAt", void 0);
exports.RequestRegistrationEntity = RequestRegistrationEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('request_registrations')
], RequestRegistrationEntity);


/***/ }),
/* 36 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TaskEntity = exports.TaskStatus = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const user_entity_1 = __webpack_require__(19);
const project_group_entity_1 = __webpack_require__(28);
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["Pending"] = "pending";
    TaskStatus["InProgress"] = "in_progress";
    TaskStatus["Completed"] = "completed";
    TaskStatus["Closed"] = "closed";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
let TaskEntity = class TaskEntity {
};
exports.TaskEntity = TaskEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], TaskEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)(),
    tslib_1.__metadata("design:type", String)
], TaskEntity.prototype, "title", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    tslib_1.__metadata("design:type", String)
], TaskEntity.prototype, "description", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TaskStatus, default: TaskStatus.Pending }),
    tslib_1.__metadata("design:type", String)
], TaskEntity.prototype, "status", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    tslib_1.__metadata("design:type", String)
], TaskEntity.prototype, "projectId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    tslib_1.__metadata("design:type", String)
], TaskEntity.prototype, "branchId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    tslib_1.__metadata("design:type", String)
], TaskEntity.prototype, "fileId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    tslib_1.__metadata("design:type", Number)
], TaskEntity.prototype, "filePart", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true }),
    tslib_1.__metadata("design:type", String)
], TaskEntity.prototype, "language", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { nullable: true, onDelete: 'SET NULL' }),
    tslib_1.__metadata("design:type", typeof (_a = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _a : Object)
], TaskEntity.prototype, "assignedTo", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => project_group_entity_1.ProjectGroupEntity, { nullable: true, onDelete: 'SET NULL' }),
    tslib_1.__metadata("design:type", typeof (_b = typeof project_group_entity_1.ProjectGroupEntity !== "undefined" && project_group_entity_1.ProjectGroupEntity) === "function" ? _b : Object)
], TaskEntity.prototype, "group", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { nullable: false, onDelete: 'CASCADE' }),
    tslib_1.__metadata("design:type", typeof (_c = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _c : Object)
], TaskEntity.prototype, "createdBy", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    tslib_1.__metadata("design:type", typeof (_d = typeof Date !== "undefined" && Date) === "function" ? _d : Object)
], TaskEntity.prototype, "dueDate", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_e = typeof Date !== "undefined" && Date) === "function" ? _e : Object)
], TaskEntity.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    tslib_1.__metadata("design:type", typeof (_f = typeof Date !== "undefined" && Date) === "function" ? _f : Object)
], TaskEntity.prototype, "startedAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    tslib_1.__metadata("design:type", typeof (_g = typeof Date !== "undefined" && Date) === "function" ? _g : Object)
], TaskEntity.prototype, "completedAt", void 0);
exports.TaskEntity = TaskEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('task')
], TaskEntity);


/***/ }),
/* 37 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TransactionEntity = exports.TransactionStatus = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const user_entity_1 = __webpack_require__(19);
const request_entity_1 = __webpack_require__(25);
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["Pending"] = "PENDING";
    TransactionStatus["On_Hold"] = "ON_HOLD";
    TransactionStatus["WaitingApproval"] = "WAITING_APPROVAL";
    TransactionStatus["Approved"] = "APPROVED";
    TransactionStatus["Completed"] = "COMPLETED";
    TransactionStatus["Failed"] = "FAILED";
    TransactionStatus["Rejected"] = "REJECTED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
let TransactionEntity = class TransactionEntity {
};
exports.TransactionEntity = TransactionEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    tslib_1.__metadata("design:type", Number)
], TransactionEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { nullable: false }),
    tslib_1.__metadata("design:type", typeof (_a = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _a : Object)
], TransactionEntity.prototype, "user", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => request_entity_1.RequestEntity, { nullable: true, onDelete: 'SET NULL' }),
    tslib_1.__metadata("design:type", typeof (_b = typeof request_entity_1.RequestEntity !== "undefined" && request_entity_1.RequestEntity) === "function" ? _b : Object)
], TransactionEntity.prototype, "request", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    tslib_1.__metadata("design:type", Number)
], TransactionEntity.prototype, "amount", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.Pending }),
    tslib_1.__metadata("design:type", String)
], TransactionEntity.prototype, "status", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    tslib_1.__metadata("design:type", String)
], TransactionEntity.prototype, "paypalOrderId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    tslib_1.__metadata("design:type", String)
], TransactionEntity.prototype, "paypalEmail", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], TransactionEntity.prototype, "createdAt", void 0);
exports.TransactionEntity = TransactionEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('transactions')
], TransactionEntity);


/***/ }),
/* 38 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TranslationApprovalEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const request_entity_1 = __webpack_require__(25);
const user_entity_1 = __webpack_require__(19);
let TranslationApprovalEntity = class TranslationApprovalEntity {
};
exports.TranslationApprovalEntity = TranslationApprovalEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    tslib_1.__metadata("design:type", Number)
], TranslationApprovalEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => request_entity_1.RequestEntity),
    tslib_1.__metadata("design:type", typeof (_a = typeof request_entity_1.RequestEntity !== "undefined" && request_entity_1.RequestEntity) === "function" ? _a : Object)
], TranslationApprovalEntity.prototype, "request", void 0);
tslib_1.__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity),
    tslib_1.__metadata("design:type", typeof (_b = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _b : Object)
], TranslationApprovalEntity.prototype, "user", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)(),
    tslib_1.__metadata("design:type", Boolean)
], TranslationApprovalEntity.prototype, "isApproved", void 0);
tslib_1.__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    tslib_1.__metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], TranslationApprovalEntity.prototype, "createdAt", void 0);
exports.TranslationApprovalEntity = TranslationApprovalEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('translation_approvals')
], TranslationApprovalEntity);


/***/ }),
/* 39 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WalletEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const user_entity_1 = __webpack_require__(19);
let WalletEntity = class WalletEntity {
};
exports.WalletEntity = WalletEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    tslib_1.__metadata("design:type", Number)
], WalletEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.UserEntity),
    (0, typeorm_1.JoinColumn)(),
    tslib_1.__metadata("design:type", typeof (_a = typeof user_entity_1.UserEntity !== "undefined" && user_entity_1.UserEntity) === "function" ? _a : Object)
], WalletEntity.prototype, "user", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, default: 0 }),
    tslib_1.__metadata("design:type", Number)
], WalletEntity.prototype, "balance", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    tslib_1.__metadata("design:type", String)
], WalletEntity.prototype, "paypalEmail", void 0);
exports.WalletEntity = WalletEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('wallets')
], WalletEntity);


/***/ }),
/* 40 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SettingsEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
let SettingsEntity = class SettingsEntity {
};
exports.SettingsEntity = SettingsEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    tslib_1.__metadata("design:type", Number)
], SettingsEntity.prototype, "id", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    tslib_1.__metadata("design:type", String)
], SettingsEntity.prototype, "key", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 5.0 }),
    tslib_1.__metadata("design:type", Number)
], SettingsEntity.prototype, "value", void 0);
exports.SettingsEntity = SettingsEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)('settings')
], SettingsEntity);


/***/ }),
/* 41 */
/***/ ((module) => {

module.exports = require("@nestjs/mongoose");

/***/ }),
/* 42 */
/***/ ((module) => {

module.exports = require("mongoose");

/***/ }),
/* 43 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthModule = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const jwt_1 = __webpack_require__(44);
const typeorm_1 = __webpack_require__(10);
const auth_service_1 = __webpack_require__(45);
const jwt_strategy_1 = __webpack_require__(52);
const Entities_1 = __webpack_require__(16);
const auth_controller_1 = __webpack_require__(55);
const config_1 = __webpack_require__(5);
const jwt_guard_1 = __webpack_require__(56);
const jwt_fallthrough_guard_1 = __webpack_require__(74);
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = tslib_1.__decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([Entities_1.UserEntity, Entities_1.UserTypeEntity, Entities_1.AuthTokenEntity]),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: { expiresIn: configService.get('JWT_EXPIRATION') },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy, jwt_guard_1.JwtAuthGuard, jwt_fallthrough_guard_1.JwtFallthroughGuard],
        exports: [auth_service_1.AuthService, jwt_guard_1.JwtAuthGuard, jwt_fallthrough_guard_1.JwtFallthroughGuard],
    })
], AuthModule);


/***/ }),
/* 44 */
/***/ ((module) => {

module.exports = require("@nestjs/jwt");

/***/ }),
/* 45 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var AuthService_1;
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const jwt_1 = __webpack_require__(44);
const typeorm_1 = __webpack_require__(10);
const config_1 = __webpack_require__(5);
const bcrypt = tslib_1.__importStar(__webpack_require__(46));
const google_auth_library_1 = __webpack_require__(47);
const typeorm_2 = __webpack_require__(15);
const Entities_1 = __webpack_require__(16);
const Entities_2 = __webpack_require__(16);
const uuid_1 = __webpack_require__(48);
const mailer_1 = __webpack_require__(49);
const crypto = tslib_1.__importStar(__webpack_require__(50));
const timers_1 = __webpack_require__(51);
const typeorm_3 = __webpack_require__(15);
const Entities_3 = __webpack_require__(16);
let AuthService = AuthService_1 = class AuthService {
    constructor(mailerService, jwt, configService, userRepository, authRepository, roleRepository) {
        this.mailerService = mailerService;
        this.jwt = jwt;
        this.configService = configService;
        this.userRepository = userRepository;
        this.authRepository = authRepository;
        this.roleRepository = roleRepository;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.resetSessions = new Map();
        const googleClientId = this.configService.get('GOOGLE_OAUTH2_CLIENT');
        if (!googleClientId) {
            throw new Error('GOOGLE_OAUTH2_CLIENT is not set in the environment variables');
        }
        this.googleClient = new google_auth_library_1.OAuth2Client(googleClientId);
        this.refreshExpiry =
            this.configService.get('REFRESH_TOKEN_EXPIRY') ?? '7d';
        this.accessExpiry =
            this.configService.get('ACCESS_TOKEN_EXPIRY') ?? '1h';
        (0, timers_1.setInterval)(() => this.cleanupExpiredSessions(), 60 * 1000);
        this.logger.log('AuthService initialized');
    }
    async cleanupExpiredSessions() {
        const now = new Date();
        await this.authRepository.delete({ accessTokenExpiresAt: (0, typeorm_3.LessThan)(now) });
        await this.authRepository.delete({
            lastActivityAt: (0, typeorm_3.LessThan)(new Date(now.getTime() - 30 * 60 * 1000)),
        }); // 30 min inactivity
    }
    async refreshTokens(refreshToken) {
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('Refresh token is missing');
        }
        const meta = await this.authRepository.findOne({
            where: { refreshToken },
            relations: ['user', 'user.role']
        });
        if (!meta) {
            throw new common_1.UnauthorizedException('Refresh token expired or invalid');
        }
        const now = new Date();
        if (meta.refreshTokenExpiresAt < now) {
            await this.authRepository.delete({ refreshToken });
            throw new common_1.UnauthorizedException('Refresh token expired');
        }
        // Inactivity check (30 min)
        if (meta.lastActivityAt < new Date(now.getTime() - 30 * 60 * 1000)) {
            await this.authRepository.delete({ refreshToken });
            throw new common_1.UnauthorizedException('Session expired due to inactivity');
        }
        // Update last activity
        meta.lastActivityAt = now;
        await this.authRepository.save(meta);
        // Get user from relation
        const user = meta.user;
        if (!user) {
            this.logger.warn(`User with ID ${meta.userId} not found during token refresh`);
            await this.authRepository.delete({ refreshToken });
            throw new common_1.UnauthorizedException('User not found');
        }
        return this.generateTokenPair(user);
    }
    async validateToken(token) {
        if (!token) {
            throw new common_1.UnauthorizedException('Token is missing');
        }
        const meta = await this.authRepository.findOne({
            where: { accessToken: token },
            relations: ['user', 'user.role']
        });
        if (!meta) {
            throw new common_1.UnauthorizedException('Token expired or invalid');
        }
        const now = new Date();
        if (meta.accessTokenExpiresAt < now) {
            await this.authRepository.delete({ accessToken: token });
            throw new common_1.UnauthorizedException('Token expired');
        }
        // Inactivity check (30 min)
        if (meta.lastActivityAt < new Date(now.getTime() - 30 * 60 * 1000)) {
            await this.authRepository.delete({ accessToken: token });
            throw new common_1.UnauthorizedException('Session expired due to inactivity');
        }
        // Update last activity
        meta.lastActivityAt = now;
        await this.authRepository.save(meta);
        const user = meta.user;
        if (!user) {
            await this.authRepository.delete({ accessToken: token });
            throw new common_1.UnauthorizedException('User not found');
        }
        return {
            id: user.id,
            username: user.username,
            role: Number(user.role.id),
            avatarUrl: user.avatarUrl,
            fullName: user.fullName,
            email: user.email,
        };
    }
    async login(username, password) {
        const user = await this.userRepository.findOne({
            where: { username },
            relations: ['role'],
        });
        if (!user?.isActive) {
            throw new common_1.UnauthorizedException('Your account have been deactivated');
        }
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            throw new common_1.UnauthorizedException('Invalid credentials.');
        }
        return this.generateTokenPair(user);
    }
    async loginWithGoogle(idToken) {
        const ticket = await this.googleClient.verifyIdToken({
            idToken,
            audience: this.configService.get('GOOGLE_OAUTH2_CLIENT'),
        });
        const payload = ticket.getPayload();
        if (!payload)
            throw new common_1.UnauthorizedException('Invalid Google token');
        const { email, name } = payload;
        let user = await this.userRepository.findOne({
            where: { email },
            relations: ['role'],
        });
        console.log('Found user for Google login:', user);
        // Check if existing user is active
        if (user && !user.isActive) {
            throw new common_1.UnauthorizedException('Your account has been deactivated');
        }
        if (!user) {
            const username = email;
            const existingUser = await this.userRepository.findOne({
                where: { username },
            });
            if (existingUser)
                throw new common_1.BadRequestException('User with this email already exists');
            // Find Member role from database
            const memberRole = await this.roleRepository.findOne({
                where: { name: 'MEMBER' },
            });
            if (!memberRole) {
                throw new Error('Member role not found in database');
            }
            user = this.userRepository.create({
                username,
                email,
                passwordHash: '',
                fullName: name,
                phone: '',
                role: memberRole,
                isActive: true,
            });
            await this.userRepository.save(user);
        }
        if (!user.role) {
            user.role = { id: BigInt(Entities_1.UserRole.Member) };
            await this.userRepository.save(user);
        }
        return this.generateTokenPair(user);
    }
    async logout(token, allSessions = false) {
        const meta = await this.authRepository.findOne({
            where: [{ accessToken: token }, { refreshToken: token }],
            relations: ['user']
        });
        if (!meta) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
        if (allSessions) {
            await this.authRepository.delete({ userId: meta.userId });
            this.logger.log(`User ${meta.userId} logged out from all sessions`);
        }
        else {
            await this.authRepository.delete({ sessionId: meta.sessionId });
            this.logger.log(`User ${meta.userId} logged out from session ${meta.sessionId}`);
        }
        return { message: 'Logged out successfully' };
    }
    async sendResetCode(email) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const code = crypto.randomBytes(3).toString('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        this.resetSessions.set(email, { code, expiresAt });
        await this.mailerService.sendMail({
            to: email,
            subject: 'Password Reset Code',
            template: './reset-code',
            context: { code },
        });
        return { message: 'Reset code sent' };
    }
    async verifyResetCode(email, code) {
        const session = this.resetSessions.get(email);
        if (!session || session.code !== code || new Date() > session.expiresAt) {
            throw new common_1.NotFoundException('Invalid or expired reset code');
        }
        return { message: 'Code verified' };
    }
    async resetPassword(email, code, newPassword) {
        const session = this.resetSessions.get(email);
        if (!session || session.code !== code || new Date() > session.expiresAt) {
            throw new common_1.NotFoundException('Invalid or expired reset code');
        }
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.userRepository.save(user);
        this.resetSessions.delete(email);
        return { message: 'Password reset successful' };
    }
    getExpiryDate(duration) {
        // duration:  '15m', '7d'
        const now = new Date();
        const match = duration.match(/(\d+)([smhd])/);
        if (!match)
            return now;
        const value = parseInt(match[1], 10);
        switch (match[2]) {
            case 's':
                return new Date(now.getTime() + value * 1000);
            case 'm':
                return new Date(now.getTime() + value * 60 * 1000);
            case 'h':
                return new Date(now.getTime() + value * 60 * 60 * 1000);
            case 'd':
                return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
            default:
                return now;
        }
    }
    async generateTokenPair(user) {
        const now = new Date();
        const accessTokenExpiresAt = this.getExpiryDate(this.accessExpiry);
        const refreshTokenExpiresAt = this.getExpiryDate(this.refreshExpiry);
        const jwtPayload = {
            sub: Date.now().toString(2),
            userId: user.id.toString(),
            username: user.username,
        };
        const accessToken = this.jwt.sign(jwtPayload, {
            expiresIn: this.accessExpiry,
        });
        const refreshToken = this.jwt.sign(jwtPayload, {
            expiresIn: this.refreshExpiry,
        });
        const meta = this.authRepository.create({
            accessToken,
            refreshToken,
            userId: user.id,
            sessionId: (0, uuid_1.v4)(),
            accessTokenExpiresAt,
            refreshTokenExpiresAt,
            lastActivityAt: now,
        });
        await this.authRepository.save(meta);
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                role: {
                    id: Number(user.role.id),
                    name: user.role.name,
                },
                avatarUrl: user.avatarUrl,
                fullName: user.fullName,
                email: user.email,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(3, (0, typeorm_1.InjectRepository)(Entities_1.UserEntity)),
    tslib_1.__param(4, (0, typeorm_1.InjectRepository)(Entities_2.AuthTokenEntity)),
    tslib_1.__param(5, (0, typeorm_1.InjectRepository)(Entities_3.UserTypeEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof mailer_1.MailerService !== "undefined" && mailer_1.MailerService) === "function" ? _a : Object, typeof (_b = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _b : Object, typeof (_c = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _c : Object, typeof (_d = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _d : Object, typeof (_e = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _e : Object, typeof (_f = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _f : Object])
], AuthService);


/***/ }),
/* 46 */
/***/ ((module) => {

module.exports = require("bcryptjs");

/***/ }),
/* 47 */
/***/ ((module) => {

module.exports = require("google-auth-library");

/***/ }),
/* 48 */
/***/ ((module) => {

module.exports = require("uuid");

/***/ }),
/* 49 */
/***/ ((module) => {

module.exports = require("@nestjs-modules/mailer");

/***/ }),
/* 50 */
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),
/* 51 */
/***/ ((module) => {

module.exports = require("timers");

/***/ }),
/* 52 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JwtStrategy = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const passport_1 = __webpack_require__(53);
const passport_jwt_1 = __webpack_require__(54);
const auth_service_1 = __webpack_require__(45);
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    validate() {
        throw new Error('Unexpected call to JwtStrategy#validate()');
    }
    constructor(authService) {
        super({
            jwtFromRequest: (req) => {
                // Extract token from cookies first, then fallback to Authorization header
                return req.cookies?.access_token || passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken()(req);
            },
            secretOrKey: process.env.JWT_SECRET_KEY ?? 'secret', // MUST match JWT module config
            passReqToCallback: true,
        });
        this.authService = authService;
        this.logger = new common_1.Logger('JwtStrategy');
    }
    authenticate(req) {
        const token = req.cookies?.access_token || passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        this.authService.validateToken(token)
            .then(user => {
            if (!user) {
                this.logger.warn(`Unauthorized access attempt with token: ${token}`);
                /* unreachable */ return this.fail('Unauthorized', 401);
            }
            req.user = user;
            return this.success(user);
        })
            .catch(error => this.fail(error, 401));
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof auth_service_1.AuthService !== "undefined" && auth_service_1.AuthService) === "function" ? _a : Object])
], JwtStrategy);


/***/ }),
/* 53 */
/***/ ((module) => {

module.exports = require("@nestjs/passport");

/***/ }),
/* 54 */
/***/ ((module) => {

module.exports = require("passport-jwt");

/***/ }),
/* 55 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const auth_service_1 = __webpack_require__(45);
const jwt_guard_1 = __webpack_require__(56);
const decorators_1 = __webpack_require__(57);
const role_guard_1 = __webpack_require__(60);
const Dtos_1 = __webpack_require__(61);
const Entities_1 = __webpack_require__(16);
const config_1 = __webpack_require__(5);
const logger_1 = __webpack_require__(73);
let AuthController = class AuthController {
    constructor(authService, configService) {
        this.authService = authService;
        this.configService = configService;
    }
    async login(body, res) {
        const { accessToken, refreshToken, user } = await this.authService.login(body.username, body.password);
        // Set access token cookie
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            expires: this.authService.getExpiryDate(this.configService.get('ACCESS_TOKEN_EXPIRY') || '15m'),
        });
        // Set refresh token cookie similarly
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            expires: this.authService.getExpiryDate(this.configService.get('REFRESH_TOKEN_EXPIRY') || '7d'),
        });
        return res.json({ user });
    }
    async loginWithGoogle(idToken, res) {
        const { accessToken, refreshToken, user } = await this.authService.loginWithGoogle(idToken);
        logger_1.logger.log(idToken);
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 15, // 15 mins
        });
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7,
        });
        logger_1.logger.log(user);
        return { user };
    }
    async refreshTokens(req, res) {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token not found' });
        }
        const { accessToken, refreshToken: newRefreshToken, user, } = await this.authService.refreshTokens(refreshToken);
        // Set new access token cookie
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            expires: this.authService.getExpiryDate(this.configService.get('ACCESS_TOKEN_EXPIRY') || '15m'),
        });
        // Set new refresh token cookie
        res.cookie('refresh_token', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            expires: this.authService.getExpiryDate(this.configService.get('REFRESH_TOKEN_EXPIRY') || '7d'),
        });
        return res.json({ user });
    }
    getAdminHome(req) {
        return `Welcome, ${req.user.username} (ADMIN)`;
    }
    getStudentHome(req) {
        return `Welcome, ${req.user.username} (MEMBER)`;
    }
    async logout(req, res) {
        const accessToken = req.cookies?.access_token;
        // const refreshToken = req.cookies?.refresh_token;
        if (accessToken) {
            await this.authService.logout(accessToken);
        }
        //multi session logout
        // if (refreshToken) {
        //   await this.authRepository.delete({ refreshToken });
        // }
        // Clear both old and new cookie names for backward compatibility
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.json({ message: 'Logged out successfully' });
    }
    forgotPassword(email) {
        return this.authService.sendResetCode(email);
    }
    verifyCode(body) {
        return this.authService.verifyResetCode(body.email, body.code);
    }
    resetPassword(body) {
        return this.authService.resetPassword(body.email, body.code, body.newPassword);
    }
    async getCurrentUser(req) {
        const token = req.cookies?.access_token;
        if (!token) {
            throw new common_1.UnauthorizedException('No access token found');
        }
        return await this.authService.validateToken(token);
    }
};
exports.AuthController = AuthController;
tslib_1.__decorate([
    (0, decorators_1.IsPublicEndpoint)(),
    (0, common_1.Post)('login'),
    tslib_1.__param(0, (0, common_1.Body)()),
    tslib_1.__param(1, (0, common_1.Res)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_c = typeof Dtos_1.LoginDto !== "undefined" && Dtos_1.LoginDto) === "function" ? _c : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
tslib_1.__decorate([
    (0, decorators_1.IsPublicEndpoint)(),
    (0, common_1.Post)('google'),
    tslib_1.__param(0, (0, common_1.Body)('idToken')),
    tslib_1.__param(1, (0, common_1.Res)({ passthrough: true })),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthController.prototype, "loginWithGoogle", null);
tslib_1.__decorate([
    (0, decorators_1.IsPublicEndpoint)(),
    (0, common_1.Post)('refresh'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__param(1, (0, common_1.Res)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthController.prototype, "refreshTokens", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, role_guard_1.RolesGuard),
    (0, decorators_1.ForRoles)(Entities_1.UserRole.Admin),
    (0, common_1.Get)('admin-home'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "getAdminHome", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, role_guard_1.RolesGuard),
    (0, decorators_1.ForRoles)(Entities_1.UserRole.Member),
    (0, common_1.Get)('user-home'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "getStudentHome", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('logout'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__param(1, (0, common_1.Res)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
tslib_1.__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, decorators_1.IsPublicEndpoint)(),
    tslib_1.__param(0, (0, common_1.Body)('email')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "forgotPassword", null);
tslib_1.__decorate([
    (0, common_1.Post)('verify-code'),
    (0, decorators_1.IsPublicEndpoint)(),
    tslib_1.__param(0, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "verifyCode", null);
tslib_1.__decorate([
    (0, common_1.Post)('reset-password'),
    (0, decorators_1.IsPublicEndpoint)(),
    tslib_1.__param(0, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "resetPassword", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthController.prototype, "getCurrentUser", null);
exports.AuthController = AuthController = tslib_1.__decorate([
    (0, common_1.Controller)('auth'),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof auth_service_1.AuthService !== "undefined" && auth_service_1.AuthService) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object])
], AuthController);


/***/ }),
/* 56 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JwtAuthGuard = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const passport_1 = __webpack_require__(53);
const core_1 = __webpack_require__(3);
const decorators_1 = __webpack_require__(57);
let JwtAuthGuard = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    constructor(reflector) {
        super();
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublicEndpoint = this.reflector.getAllAndOverride(decorators_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublicEndpoint) {
            return true;
        }
        return super.canActivate(context);
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof core_1.Reflector !== "undefined" && core_1.Reflector) === "function" ? _a : Object])
], JwtAuthGuard);


/***/ }),
/* 57 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(1);
tslib_1.__exportStar(__webpack_require__(58), exports);
tslib_1.__exportStar(__webpack_require__(59), exports);


/***/ }),
/* 58 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IsPublicEndpoint = exports.IS_PUBLIC_KEY = void 0;
const common_1 = __webpack_require__(2);
exports.IS_PUBLIC_KEY = 'HTT_PUBLIC_ENDPOINT';
const IsPublicEndpoint = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.IsPublicEndpoint = IsPublicEndpoint;


/***/ }),
/* 59 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ForRoles = void 0;
const common_1 = __webpack_require__(2);
const ForRoles = (...roles) => (0, common_1.SetMetadata)('roles', roles);
exports.ForRoles = ForRoles;


/***/ }),
/* 60 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RolesGuard = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const core_1 = __webpack_require__(3);
let RolesGuard = class RolesGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const roles = this.reflector.get('roles', context.getHandler());
        if (!roles)
            return true;
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        return roles.some(role => role === Number(user.role.id));
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof core_1.Reflector !== "undefined" && core_1.Reflector) === "function" ? _a : Object])
], RolesGuard);


/***/ }),
/* 61 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(1);
tslib_1.__exportStar(__webpack_require__(62), exports);
tslib_1.__exportStar(__webpack_require__(63), exports);
tslib_1.__exportStar(__webpack_require__(66), exports);
tslib_1.__exportStar(__webpack_require__(67), exports);
tslib_1.__exportStar(__webpack_require__(68), exports);
tslib_1.__exportStar(__webpack_require__(69), exports);
tslib_1.__exportStar(__webpack_require__(70), exports);
tslib_1.__exportStar(__webpack_require__(71), exports);
tslib_1.__exportStar(__webpack_require__(72), exports);


/***/ }),
/* 62 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LoginDto = void 0;
const tslib_1 = __webpack_require__(1);
const class_validator_1 = __webpack_require__(7);
class LoginDto {
}
exports.LoginDto = LoginDto;
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], LoginDto.prototype, "username", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], LoginDto.prototype, "password", void 0);


/***/ }),
/* 63 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateProjectGroupDto = exports.CreateProjectGroupDto = exports.UserIdsArray = exports.UpdateProjectRoleDto = exports.CreateProjectRoleDto = exports.UpdateProjectMetadataDto = exports.CreateProjectDto = void 0;
const tslib_1 = __webpack_require__(1);
const class_validator_extensions_1 = __webpack_require__(64);
const class_validator_1 = __webpack_require__(7);
class CreateProjectDto {
}
exports.CreateProjectDto = CreateProjectDto;
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], CreateProjectDto.prototype, "name", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateProjectDto.prototype, "description", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MinLength)(1, { each: true }),
    tslib_1.__metadata("design:type", Array)
], CreateProjectDto.prototype, "tags", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    tslib_1.__metadata("design:type", Boolean)
], CreateProjectDto.prototype, "isPrivate", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumberString)(),
    tslib_1.__metadata("design:type", String)
], CreateProjectDto.prototype, "categoryId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MinLength)(2, { each: true }),
    tslib_1.__metadata("design:type", Array)
], CreateProjectDto.prototype, "targetLanguages", void 0);
class UpdateProjectMetadataDto {
}
exports.UpdateProjectMetadataDto = UpdateProjectMetadataDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], UpdateProjectMetadataDto.prototype, "name", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateProjectMetadataDto.prototype, "description", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MinLength)(1, { each: true }),
    tslib_1.__metadata("design:type", Array)
], UpdateProjectMetadataDto.prototype, "addTags", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MinLength)(1, { each: true }),
    tslib_1.__metadata("design:type", Array)
], UpdateProjectMetadataDto.prototype, "removeTags", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    tslib_1.__metadata("design:type", Boolean)
], UpdateProjectMetadataDto.prototype, "isPrivate", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    tslib_1.__metadata("design:type", String)
], UpdateProjectMetadataDto.prototype, "categoryId", void 0);
class CreateProjectRoleDto {
}
exports.CreateProjectRoleDto = CreateProjectRoleDto;
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], CreateProjectRoleDto.prototype, "name", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_extensions_1.IsBigInt)(),
    tslib_1.__metadata("design:type", BigInt)
], CreateProjectRoleDto.prototype, "permissionFlags", void 0);
class UpdateProjectRoleDto {
}
exports.UpdateProjectRoleDto = UpdateProjectRoleDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], UpdateProjectRoleDto.prototype, "name", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_extensions_1.IsBigInt)(),
    tslib_1.__metadata("design:type", BigInt)
], UpdateProjectRoleDto.prototype, "permissionFlags", void 0);
class UserIdsArray {
}
exports.UserIdsArray = UserIdsArray;
tslib_1.__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_extensions_1.IsBigInt)({ each: true }),
    tslib_1.__metadata("design:type", Array)
], UserIdsArray.prototype, "userIds", void 0);
class CreateProjectGroupDto {
}
exports.CreateProjectGroupDto = CreateProjectGroupDto;
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], CreateProjectGroupDto.prototype, "name", void 0);
class UpdateProjectGroupDto {
}
exports.UpdateProjectGroupDto = UpdateProjectGroupDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], UpdateProjectGroupDto.prototype, "name", void 0);


/***/ }),
/* 64 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IsBigInt = IsBigInt;
const class_validator_1 = __webpack_require__(7);
const bigint_utils_1 = __webpack_require__(65);
/** Decorator extension for checking whether the given value can be coerced into a `BigInt`. */
function IsBigInt(validationOptions) {
    return (0, class_validator_1.ValidateBy)({
        name: bigint_utils_1.isBigInt.name,
        validator: {
            validate: (value) => (0, bigint_utils_1.isBigInt)(value),
            defaultMessage: (0, class_validator_1.buildMessage)(eachPrefix => `${eachPrefix}$property must be a BigInt or a string/number that can be safely converted to BigInt`, validationOptions)
        }
    }, validationOptions);
}


/***/ }),
/* 65 */
/***/ ((module) => {

module.exports = require("@here-to-translate/common/bigint-utils");

/***/ }),
/* 66 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateCommentDto = exports.PostCommentDto = exports.DiscussionAccessPolicyDto = exports.UpdateDiscussionDto = exports.CreateDiscussionDto = void 0;
const tslib_1 = __webpack_require__(1);
const class_validator_extensions_1 = __webpack_require__(64);
const class_validator_1 = __webpack_require__(7);
class CreateDiscussionDto {
}
exports.CreateDiscussionDto = CreateDiscussionDto;
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], CreateDiscussionDto.prototype, "title", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateDiscussionDto.prototype, "description", void 0);
class UpdateDiscussionDto {
}
exports.UpdateDiscussionDto = UpdateDiscussionDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateDiscussionDto.prototype, "title", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateDiscussionDto.prototype, "description", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    tslib_1.__metadata("design:type", Boolean)
], UpdateDiscussionDto.prototype, "isPinned", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    tslib_1.__metadata("design:type", Boolean)
], UpdateDiscussionDto.prototype, "isArchived", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    tslib_1.__metadata("design:type", Array)
], UpdateDiscussionDto.prototype, "accessPolicyOverrides", void 0);
class DiscussionAccessPolicyDto {
}
exports.DiscussionAccessPolicyDto = DiscussionAccessPolicyDto;
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_extensions_1.IsBigInt)(),
    tslib_1.__metadata("design:type", BigInt)
], DiscussionAccessPolicyDto.prototype, "roleId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_extensions_1.IsBigInt)(),
    tslib_1.__metadata("design:type", BigInt)
], DiscussionAccessPolicyDto.prototype, "allowOverrides", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_extensions_1.IsBigInt)(),
    tslib_1.__metadata("design:type", BigInt)
], DiscussionAccessPolicyDto.prototype, "denyOverrides", void 0);
class PostCommentDto {
}
exports.PostCommentDto = PostCommentDto;
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    tslib_1.__metadata("design:type", String)
], PostCommentDto.prototype, "content", void 0);
class UpdateCommentDto {
}
exports.UpdateCommentDto = UpdateCommentDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateCommentDto.prototype, "content", void 0);


/***/ }),
/* 67 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateUserPasswordDto = exports.UpdateUserProfileDto = exports.RegisterDto = void 0;
const tslib_1 = __webpack_require__(1);
const class_validator_1 = __webpack_require__(7);
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], RegisterDto.prototype, "username", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEmail)(),
    tslib_1.__metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsStrongPassword)({
        minLength: 8,
        minSymbols: 1,
        minNumbers: 1,
        minLowercase: 1,
        minUppercase: 1
    }, { message: 'Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character' }),
    tslib_1.__metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsPhoneNumber)(undefined, {
        message: 'Phone number must be a valid international format, e.g. +1234567890'
    }),
    tslib_1.__metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], RegisterDto.prototype, "fullName", void 0);
class UpdateUserProfileDto {
}
exports.UpdateUserProfileDto = UpdateUserProfileDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], UpdateUserProfileDto.prototype, "username", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    tslib_1.__metadata("design:type", String)
], UpdateUserProfileDto.prototype, "email", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsPhoneNumber)(undefined, {
        message: 'Phone number must be a valid international format, e.g. +1234567890'
    }),
    tslib_1.__metadata("design:type", String)
], UpdateUserProfileDto.prototype, "phone", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    tslib_1.__metadata("design:type", String)
], UpdateUserProfileDto.prototype, "fullName", void 0);
class UpdateUserPasswordDto {
}
exports.UpdateUserPasswordDto = UpdateUserPasswordDto;
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    tslib_1.__metadata("design:type", String)
], UpdateUserPasswordDto.prototype, "currentPassword", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsStrongPassword)({
        minLength: 8,
        minSymbols: 1,
        minNumbers: 1,
        minLowercase: 1,
        minUppercase: 1
    }, { message: 'New password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character' }),
    tslib_1.__metadata("design:type", String)
], UpdateUserPasswordDto.prototype, "newPassword", void 0);


/***/ }),
/* 68 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateCategoryDto = exports.CreateCategoryDto = void 0;
const tslib_1 = __webpack_require__(1);
const class_validator_1 = __webpack_require__(7);
class CreateCategoryDto {
}
exports.CreateCategoryDto = CreateCategoryDto;
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], CreateCategoryDto.prototype, "name", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateCategoryDto.prototype, "description", void 0);
class UpdateCategoryDto {
}
exports.UpdateCategoryDto = UpdateCategoryDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], UpdateCategoryDto.prototype, "name", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateCategoryDto.prototype, "description", void 0);


/***/ }),
/* 69 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ReviewRequestDto = exports.UpdateRequestDto = exports.CreateRequestDto = void 0;
const tslib_1 = __webpack_require__(1);
const Entities_1 = __webpack_require__(16);
const class_validator_1 = __webpack_require__(7);
const class_transformer_1 = __webpack_require__(6);
class CreateRequestDto {
}
exports.CreateRequestDto = CreateRequestDto;
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    tslib_1.__metadata("design:type", String)
], CreateRequestDto.prototype, "title", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateRequestDto.prototype, "description", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    tslib_1.__metadata("design:type", Number)
], CreateRequestDto.prototype, "dealAmount", void 0);
tslib_1.__decorate([
    (0, class_validator_1.MaxLength)(10),
    (0, class_validator_1.IsDateString)({ strict: true }),
    tslib_1.__metadata("design:type", String)
], CreateRequestDto.prototype, "deadline", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    tslib_1.__metadata("design:type", String)
], CreateRequestDto.prototype, "assigneeId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    tslib_1.__metadata("design:type", String)
], CreateRequestDto.prototype, "projectId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumberString)(),
    tslib_1.__metadata("design:type", String)
], CreateRequestDto.prototype, "categoryId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MinLength)(1, { each: true }),
    tslib_1.__metadata("design:type", Array)
], CreateRequestDto.prototype, "tags", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MinLength)(1, { each: true }),
    tslib_1.__metadata("design:type", Array)
], CreateRequestDto.prototype, "targetLanguages", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    tslib_1.__metadata("design:type", Array)
], CreateRequestDto.prototype, "files", void 0);
class UpdateRequestDto {
}
exports.UpdateRequestDto = UpdateRequestDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateRequestDto.prototype, "title", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateRequestDto.prototype, "description", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    tslib_1.__metadata("design:type", Number)
], UpdateRequestDto.prototype, "dealAmount", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({ strict: true }),
    (0, class_validator_1.MaxLength)(10),
    tslib_1.__metadata("design:type", String)
], UpdateRequestDto.prototype, "deadline", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateRequestDto.prototype, "categoryId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MinLength)(1, { each: true }),
    tslib_1.__metadata("design:type", Array)
], UpdateRequestDto.prototype, "tags", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Entities_1.RequestStatus),
    tslib_1.__metadata("design:type", typeof (_a = typeof Entities_1.RequestStatus !== "undefined" && Entities_1.RequestStatus) === "function" ? _a : Object)
], UpdateRequestDto.prototype, "status", void 0);
class ReviewRequestDto {
}
exports.ReviewRequestDto = ReviewRequestDto;
tslib_1.__decorate([
    (0, class_validator_1.IsEnum)(Entities_1.RequestStatus, {
        message: 'Invalid status. Must be APPROVED or REJECTED.',
    }),
    tslib_1.__metadata("design:type", typeof (_b = typeof Entities_1.RequestStatus !== "undefined" && Entities_1.RequestStatus) === "function" ? _b : Object)
], ReviewRequestDto.prototype, "status", void 0);


/***/ }),
/* 70 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateProjectTagDto = exports.CreateProjectTagDto = void 0;
const tslib_1 = __webpack_require__(1);
const class_validator_1 = __webpack_require__(7);
class CreateProjectTagDto {
}
exports.CreateProjectTagDto = CreateProjectTagDto;
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateProjectTagDto.prototype, "name", void 0);
class UpdateProjectTagDto {
}
exports.UpdateProjectTagDto = UpdateProjectTagDto;
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateProjectTagDto.prototype, "name", void 0);


/***/ }),
/* 71 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CreateMessageDto = void 0;
const tslib_1 = __webpack_require__(1);
const class_validator_1 = __webpack_require__(7);
class CreateMessageDto {
}
exports.CreateMessageDto = CreateMessageDto;
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], CreateMessageDto.prototype, "roomId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], CreateMessageDto.prototype, "message", void 0);


/***/ }),
/* 72 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChangePasswordDto = void 0;
const tslib_1 = __webpack_require__(1);
const class_validator_1 = __webpack_require__(7);
class ChangePasswordDto {
}
exports.ChangePasswordDto = ChangePasswordDto;
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], ChangePasswordDto.prototype, "currentPassword", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsStrongPassword)({
        minLength: 8,
        minSymbols: 1,
        minNumbers: 1,
        minLowercase: 1,
        minUppercase: 1,
    }, {
        message: 'Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
    }),
    tslib_1.__metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);


/***/ }),
/* 73 */
/***/ ((module) => {

module.exports = require("nx/src/utils/logger");

/***/ }),
/* 74 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JwtFallthroughGuard = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const auth_service_1 = __webpack_require__(45);
const passport_jwt_1 = __webpack_require__(54);
let JwtFallthroughGuard = class JwtFallthroughGuard {
    constructor(authService) {
        this.authService = authService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        let token = passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken()(request);
        if (!token && request.cookies) {
            token = request.cookies['access_token'];
        }
        if (!token) {
            return true;
        }
        try {
            request.user = await this.authService.validateToken(token); // ✅ attach user
        }
        catch {
            return false;
        }
        return true;
    }
};
exports.JwtFallthroughGuard = JwtFallthroughGuard;
exports.JwtFallthroughGuard = JwtFallthroughGuard = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof auth_service_1.AuthService !== "undefined" && auth_service_1.AuthService) === "function" ? _a : Object])
], JwtFallthroughGuard);


/***/ }),
/* 75 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SeederModule = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const seeder_service_1 = __webpack_require__(76);
const Entities_1 = __webpack_require__(16);
let SeederModule = class SeederModule {
};
exports.SeederModule = SeederModule;
exports.SeederModule = SeederModule = tslib_1.__decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([Entities_1.UserTypeEntity, Entities_1.UserEntity]),
        ],
        providers: [seeder_service_1.SeederService],
    })
], SeederModule);


/***/ }),
/* 76 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SeederService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(15);
const Entities_1 = __webpack_require__(16);
const bcrypt = tslib_1.__importStar(__webpack_require__(46));
let SeederService = class SeederService {
    constructor(roleRepo, accountRepo) {
        this.roleRepo = roleRepo;
        this.accountRepo = accountRepo;
    }
    async onApplicationBootstrap() {
        await this.seedRoles();
        await this.seedAdminAccount();
    }
    async seedRoles() {
        const roles = ['SUPER_ADMIN', 'ADMIN', 'MEMBER'];
        const troles = await this.roleRepo.find();
        console.log(troles);
        for (const roleName of roles) {
            const exists = await this.roleRepo.findOneBy({ name: roleName });
            if (!exists) {
                await this.roleRepo.save({ name: roleName });
                console.log(`✅ Role created: ${roleName}`);
            }
        }
    }
    async seedAdminAccount() {
        const existingAdmin = await this.accountRepo.findOne({ where: { username: 'admin' } });
        if (!existingAdmin) {
            const passwordHash = await bcrypt.hash('admin123', 10);
            // 🔥 id là string vì UserTypeEntity id đã sửa thành string
            const role = await this.roleRepo.findOneBy({ id: '1' });
            if (!role) {
                throw new Error("Admin role not found in roles table!");
            }
            const adminAccount = this.accountRepo.create({
                username: 'admin',
                passwordHash,
                email: 'admin@example.com',
                phone: '0123456789',
                fullName: 'System Admin',
                role,
                isActive: true,
                createdAt: new Date(),
            });
            await this.accountRepo.save(adminAccount);
            console.log(`✅ Admin account created: admin / admin123`);
        }
    }
};
exports.SeederService = SeederService;
exports.SeederService = SeederService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_1.InjectRepository)(Entities_1.UserTypeEntity)),
    tslib_1.__param(1, (0, typeorm_1.InjectRepository)(Entities_1.UserEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object])
], SeederService);


/***/ }),
/* 77 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ManagersModule = void 0;
const tslib_1 = __webpack_require__(1);
const Entities_1 = __webpack_require__(16);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const auth_module_1 = __webpack_require__(43);
const category_manager_service_1 = __webpack_require__(78);
const request_manager_service_1 = __webpack_require__(82);
const user_manager_service_1 = __webpack_require__(87);
const project_manager_service_1 = __webpack_require__(90);
const category_controller_1 = __webpack_require__(108);
const project_controller_1 = __webpack_require__(112);
const user_controller_1 = __webpack_require__(114);
const group_manager_service_1 = __webpack_require__(116);
const discussion_manager_service_1 = __webpack_require__(117);
const project_role_manager_service_1 = __webpack_require__(118);
const request_controller_1 = __webpack_require__(119);
const project_role_controller_1 = __webpack_require__(120);
const discussion_controller_1 = __webpack_require__(121);
const group_controller_1 = __webpack_require__(122);
const project_tag_manager_service_1 = __webpack_require__(123);
const project_tag_controller_1 = __webpack_require__(124);
const SqliteEntities_1 = __webpack_require__(125);
const mailer_service_1 = __webpack_require__(83);
const chat_service_1 = __webpack_require__(84);
const payment_manager_service_1 = __webpack_require__(88);
const mongo_module_1 = __webpack_require__(127);
const wallet_controller_1 = __webpack_require__(129);
const payment_controller_1 = __webpack_require__(132);
const wallet_manager_service_1 = __webpack_require__(98);
const github_manager_service_1 = __webpack_require__(92);
const file_manager_service_1 = __webpack_require__(107);
const translation_manager_service_1 = __webpack_require__(133);
const file_controller_1 = __webpack_require__(138);
const project_role_controller_2 = __webpack_require__(120);
const translation_controller_1 = __webpack_require__(139);
const admin_transaction_controller_1 = __webpack_require__(140);
const chat_controller_1 = __webpack_require__(141);
const task_manager_service_1 = __webpack_require__(143);
const task_controller_1 = __webpack_require__(145);
const task_gateway_1 = __webpack_require__(144);
const manifest_service_1 = __webpack_require__(99);
const notification_manager_service_1 = __webpack_require__(94);
const notification_controller_1 = __webpack_require__(147);
const bull_1 = __webpack_require__(148);
const ai_manager_service_1 = __webpack_require__(149);
const ai_chat_controller_1 = __webpack_require__(154);
const notification_gateway_1 = __webpack_require__(95);
const admin_notification_controller_1 = __webpack_require__(155);
const project_invitation_controller_1 = __webpack_require__(156);
const project_invitation_service_1 = __webpack_require__(157);
const fee_manager_service_1 = __webpack_require__(106);
let ManagersModule = class ManagersModule {
};
exports.ManagersModule = ManagersModule;
exports.ManagersModule = ManagersModule = tslib_1.__decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            mongo_module_1.MongoModule,
            typeorm_1.TypeOrmModule.forFeature([
                Entities_1.CategoryEntity,
                Entities_1.DiscussionAccessPolicyEntity,
                Entities_1.ProjectEntity,
                Entities_1.ProjectDiscussionThreadEntity,
                Entities_1.ProjectDiscussionCommentEntity,
                Entities_1.ProjectGroupEntity,
                Entities_1.ProjectRoleEntity,
                Entities_1.ProjectTagEntity,
                Entities_1.RequestEntity,
                Entities_1.UserEntity,
                Entities_1.UserTypeEntity,
                SqliteEntities_1.AuthEntity,
                Entities_1.TransactionEntity,
                Entities_1.WalletEntity,
                Entities_1.TranslationApprovalEntity,
                Entities_1.BranchEntity,
                Entities_1.CommitEntity,
                Entities_1.FileEntity,
                Entities_1.TaskEntity,
                Entities_1.NotificationEntity,
                Entities_1.ProjectInvitationEntity,
                Entities_1.RequestRegistrationEntity,
                Entities_1.SettingsEntity,
                Entities_1.AuthTokenEntity,
            ]),
            bull_1.BullModule.registerQueue({ name: 'extract', redis: { host: 'localhost', port: 6379 } }),
        ],
        providers: [
            category_manager_service_1.CategoryManagerService,
            request_manager_service_1.RequestManagerService,
            user_manager_service_1.UserManagerService,
            group_manager_service_1.GroupManagerService,
            project_role_manager_service_1.ProjectRoleManagerService,
            discussion_manager_service_1.DiscussionManagerService,
            project_manager_service_1.ProjectManagerService,
            project_tag_manager_service_1.ProjectTagManagerService,
            mailer_service_1.MailService,
            chat_service_1.ChatService,
            payment_manager_service_1.PaypalService,
            wallet_manager_service_1.WalletManagerService,
            github_manager_service_1.GitHubService,
            file_manager_service_1.FileService,
            translation_manager_service_1.TranslationService,
            task_manager_service_1.TaskManagerService,
            manifest_service_1.ManifestService,
            notification_manager_service_1.NotificationManagerService,
            ai_manager_service_1.AiChatService,
            task_gateway_1.TaskGateway,
            notification_gateway_1.NotificationGateway,
            project_invitation_service_1.ProjectInvitationService,
            fee_manager_service_1.FeeService,
        ],
        exports: [
            category_manager_service_1.CategoryManagerService,
            request_manager_service_1.RequestManagerService,
            user_manager_service_1.UserManagerService,
            group_manager_service_1.GroupManagerService,
            project_role_manager_service_1.ProjectRoleManagerService,
            discussion_manager_service_1.DiscussionManagerService,
            project_manager_service_1.ProjectManagerService,
            project_tag_manager_service_1.ProjectTagManagerService,
            mailer_service_1.MailService,
            chat_service_1.ChatService,
            payment_manager_service_1.PaypalService,
            wallet_manager_service_1.WalletManagerService,
            github_manager_service_1.GitHubService,
            file_manager_service_1.FileService,
            translation_manager_service_1.TranslationService,
            task_manager_service_1.TaskManagerService,
            manifest_service_1.ManifestService,
            notification_manager_service_1.NotificationManagerService,
            ai_manager_service_1.AiChatService,
            project_invitation_service_1.ProjectInvitationService,
            fee_manager_service_1.FeeService
        ],
        controllers: [
            category_controller_1.CategoryController,
            project_controller_1.ProjectController,
            request_controller_1.RequestController,
            user_controller_1.UserController,
            project_role_controller_1.ProjectRoleController,
            discussion_controller_1.DiscussionController,
            group_controller_1.GroupController,
            project_tag_controller_1.ProjectTagController,
            wallet_controller_1.WalletController,
            payment_controller_1.PaymentController,
            file_controller_1.FileController,
            project_role_controller_2.PermissionsController,
            translation_controller_1.TranslationController,
            admin_transaction_controller_1.AdminTransactionController,
            chat_controller_1.ChatController,
            task_controller_1.TaskController,
            notification_controller_1.NotificationController,
            ai_chat_controller_1.AiChatController,
            admin_notification_controller_1.AdminNotificationController,
            project_invitation_controller_1.ProjectInvitationController
        ]
    })
], ManagersModule);


/***/ }),
/* 78 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CategoryManagerService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(15);
const validation_1 = __webpack_require__(79);
const Entities_1 = __webpack_require__(16);
let CategoryManagerService = class CategoryManagerService {
    constructor(categoryRepository) {
        this.categoryRepository = categoryRepository;
    }
    async getCategories() {
        return this.categoryRepository.find();
    }
    async createCategory(data) {
        if (!data.name) {
            throw new common_1.BadRequestException('Category name is required');
        }
        if (!(0, validation_1.validateName)(data.name)) {
            throw new common_1.BadRequestException('Category name contains invalid characters or is empty after trimming');
        }
        const sanitizedName = (0, validation_1.sanitizeName)(data.name);
        const existingCategory = await this.categoryRepository.exists({
            where: { name: sanitizedName },
        });
        if (existingCategory) {
            throw new common_1.BadRequestException(`Category with name "${sanitizedName}" already exists`);
        }
        try {
            const newCategory = this.categoryRepository.create({
                name: (0, validation_1.sanitizeName)(data.name),
                description: data.description,
            });
            return this.categoryRepository.save(newCategory);
        }
        catch (error) {
            const dbError = error;
            if (dbError.code === 'ER_DUP_ENTRY') {
                throw new common_1.BadRequestException('A category with this name already exists');
            }
            console.error('Error creating category:', error);
            throw new common_1.InternalServerErrorException('Failed to create category');
        }
    }
    async updateCategory(id, data) {
        if (data.name && !(0, validation_1.validateName)(data.name)) {
            throw new common_1.BadRequestException('Category name contains invalid characters or is empty after trimming');
        }
        try {
            const updateData = {};
            if (data.name) {
                updateData.name = (0, validation_1.sanitizeName)(data.name);
            }
            if (data.description !== undefined) {
                updateData.description = data.description;
            }
            await this.categoryRepository.update({ id }, updateData);
            return this.categoryRepository.findOne({ where: { id } });
        }
        catch (error) {
            const dbError = error;
            if (dbError.code === 'ER_DUP_ENTRY') {
                throw new common_1.BadRequestException('A category with this name already exists');
            }
            console.error('Error updating category:', error);
            throw new common_1.InternalServerErrorException('Failed to update category');
        }
    }
    async deleteCategory(id) {
        try {
            return this.categoryRepository.delete({ id });
        }
        catch (error) {
            console.error('Error deleting category:', error);
            throw new common_1.InternalServerErrorException('Failed to delete category');
        }
    }
};
exports.CategoryManagerService = CategoryManagerService;
exports.CategoryManagerService = CategoryManagerService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_1.InjectRepository)(Entities_1.CategoryEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object])
], CategoryManagerService);


/***/ }),
/* 79 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.validateName = validateName;
exports.sanitizeName = sanitizeName;
exports.validateEmail = validateEmail;
const dns_1 = __webpack_require__(80);
const util_1 = __webpack_require__(81);
function validateName(name) {
    if (!name)
        return false;
    const trimmedName = name.trim();
    if (!trimmedName)
        return false;
    // Check for special characters and emojis
    const specialCharRegex = /[@#]/;
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]/u;
    return !specialCharRegex.test(trimmedName) && !emojiRegex.test(trimmedName);
}
function sanitizeName(name) {
    return name.trim();
}
async function validateEmail(email) {
    const domain = email.split('@')[1];
    const mxRecords = await (0, util_1.promisify)(dns_1.resolveMx)(domain);
    return mxRecords.length > 0;
}


/***/ }),
/* 80 */
/***/ ((module) => {

module.exports = require("dns");

/***/ }),
/* 81 */
/***/ ((module) => {

module.exports = require("util");

/***/ }),
/* 82 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var RequestManagerService_1;
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RequestManagerService = void 0;
const tslib_1 = __webpack_require__(1);
const Entities_1 = __webpack_require__(16);
const Entities_2 = __webpack_require__(16);
const typeorm_1 = __webpack_require__(15);
const common_1 = __webpack_require__(2);
const typeorm_2 = __webpack_require__(10);
const mailer_service_1 = __webpack_require__(83);
const chat_service_1 = __webpack_require__(84);
const payment_manager_service_1 = __webpack_require__(88);
const wallet_manager_service_1 = __webpack_require__(98);
const file_manager_service_1 = __webpack_require__(107);
const logger_1 = __webpack_require__(73);
const project_manager_service_1 = __webpack_require__(90);
const notification_manager_service_1 = __webpack_require__(94);
let RequestManagerService = RequestManagerService_1 = class RequestManagerService {
    constructor(requestRepository, userRepository, categoryRepository, projectTagRepository, transactionRepository, walletRepository, fileRepository, projectRepository, requestRegistrationRepository, walletService, mailService, chatService, paymentService, fileService, projectService, notificationService) {
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.projectTagRepository = projectTagRepository;
        this.transactionRepository = transactionRepository;
        this.walletRepository = walletRepository;
        this.fileRepository = fileRepository;
        this.projectRepository = projectRepository;
        this.requestRegistrationRepository = requestRegistrationRepository;
        this.walletService = walletService;
        this.mailService = mailService;
        this.chatService = chatService;
        this.paymentService = paymentService;
        this.fileService = fileService;
        this.projectService = projectService;
        this.notificationService = notificationService;
        this.logger = new common_1.Logger(RequestManagerService_1.name);
    }
    async createRequest(dto, uid, uploadedFiles = []) {
        const DAY = 24 * 60 * 60 * 1000;
        const { title, description, dealAmount, deadline: deadlineRaw } = dto;
        const deadline = new Date(deadlineRaw);
        if (deadline.getTime() - Date.now() < 7 * DAY) {
            throw new common_1.BadRequestException('Deadline must be at least 7 days from now');
        }
        const fileEntities = [];
        for (const file of uploadedFiles) {
            const { fileId } = await this.fileService.handleLocalUpload(file, uid, dto.projectId ? BigInt(dto.projectId) : undefined);
            const entity = await this.fileRepository.findOneOrFail({
                where: { id: BigInt(fileId) },
            });
            fileEntities.push(entity);
        }
        // Process tags
        const requestTags = [];
        if (dto.tags && dto.tags.length > 0) {
            for (const tag of dto.tags) {
                let tagEntity = await this.projectTagRepository.findOne({
                    where: { name: tag },
                });
                if (!tagEntity) {
                    const newTag = this.projectTagRepository.create({ name: tag });
                    tagEntity = await this.projectTagRepository.save(newTag);
                }
                requestTags.push(tagEntity);
            }
        }
        const request = this.requestRepository.create({
            requester: { id: uid },
            project: dto.projectId ? { id: BigInt(dto.projectId) } : undefined,
            registrants: dto.assigneeId ? [{ id: BigInt(dto.assigneeId) }] : [],
            assignee: dto.assigneeId ? { id: BigInt(dto.assigneeId) } : undefined,
            title,
            description,
            dealAmount,
            deadline,
            createdAt: new Date(),
            status: Entities_1.RequestStatus.Pending,
            isPublic: true,
            category: dto.categoryId ? { id: BigInt(dto.categoryId) } : undefined,
            files: fileEntities,
            targetLanguages: dto.targetLanguages || [],
            tags: requestTags,
        });
        const savedRequest = await this.requestRepository.save(request);
        // Create global notification for new public request
        await this.notificationService.createGlobalNotification({
            type: 'PUBLIC_REQUEST_CREATED',
            message: `New public request available: "${title}" - $${dealAmount}`,
            createdBy: uid,
        });
        return savedRequest;
    }
    async createPrivateRequest(dto, uid, uploadedFiles = []) {
        const DAY = 24 * 60 * 60 * 1000;
        const { title, description, dealAmount, deadline: deadlineRaw, isPublic } = dto;
        const deadline = new Date(deadlineRaw);
        if (deadline.getTime() - Date.now() < 7 * DAY) {
            throw new common_1.BadRequestException('Deadline must be at least 7 days from now');
        }
        const fileEntities = [];
        for (const file of uploadedFiles) {
            const { fileId } = await this.fileService.handleLocalUpload(file, uid, dto.projectId ? BigInt(dto.projectId) : undefined);
            const entity = await this.fileRepository.findOneOrFail({
                where: { id: BigInt(fileId) },
            });
            fileEntities.push(entity);
        }
        // Process tags
        const requestTags = [];
        if (dto.tags && dto.tags.length > 0) {
            for (const tag of dto.tags) {
                let tagEntity = await this.projectTagRepository.findOne({
                    where: { name: tag },
                });
                if (!tagEntity) {
                    const newTag = this.projectTagRepository.create({ name: tag });
                    tagEntity = await this.projectTagRepository.save(newTag);
                }
                requestTags.push(tagEntity);
            }
        }
        const request = this.requestRepository.create({
            requester: { id: uid },
            project: dto.projectId ? { id: BigInt(dto.projectId) } : undefined,
            registrants: dto.assigneeId ? [{ id: BigInt(dto.assigneeId) }] : [],
            assignee: dto.assigneeId ? { id: BigInt(dto.assigneeId) } : undefined,
            title,
            description,
            dealAmount,
            deadline,
            createdAt: new Date(),
            status: Entities_1.RequestStatus.Pending,
            isPublic,
            category: dto.categoryId ? { id: BigInt(dto.categoryId) } : undefined,
            files: fileEntities,
            targetLanguages: dto.targetLanguages || [],
            tags: requestTags,
        });
        const requesterUser = await this.userRepository.findOneOrFail({
            where: { id: BigInt(uid) },
        });
        if (!dto.assigneeId) {
            throw new common_1.BadRequestException('Assignee ID is required');
        }
        const assigneeUser = await this.userRepository.findOneOrFail({
            where: { id: BigInt(dto.assigneeId) },
        });
        // Create notification for assignee about new private request
        await this.notificationService.createNotification({
            userId: BigInt(dto.assigneeId),
            type: 'PRIVATE_REQUEST_CREATED',
            message: `You have received a new private request: "${title}" from ${requesterUser.fullName || requesterUser.username}`,
            createdBy: uid,
        });
        if (assigneeUser?.email) {
            await this.mailService.sendPrivateRequestConfirmation(assigneeUser.email, {
                title,
                deadline,
                username: requesterUser.username,
            });
        }
        const savedRequest = await this.requestRepository.save(request);
        const approvalUrl = await this.paymentService.createPrivateDeposit(dealAmount, requesterUser, savedRequest);
        return { request: savedRequest, approvalUrl };
    }
    async searchUsers(keyword, currentUserId) {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoin('user.role', 'role')
            .where('user.isActive = :active', { active: true })
            .andWhere('user.id != :currentUserId', {
            currentUserId: currentUserId.toString(),
        })
            .andWhere(`(user.username LIKE :keyword OR user.email LIKE :keyword OR user.fullName LIKE :keyword)`, { keyword: `%${keyword}%` })
            .andWhere('role.id NOT IN (:...excludedRoles)', {
            excludedRoles: [1, 2],
        })
            .getMany();
    }
    async getMyRequests(uid) {
        const queryBuilder = this.requestRepository
            .createQueryBuilder('requests')
            .select([
            'requests.id',
            'requests.title',
            'requests.description',
            'requests.dealAmount',
            'requests.deadline',
            'requests.status',
            'requests.isPublic',
            'requests.createdAt',
            'requests.targetLanguages',
            'requester.id',
            'requester.username',
            'project.id',
            'project.name',
            'category.name',
            'tags.id',
            'tags.name',
        ])
            .where('requester.id = :uid', { uid: BigInt(uid) })
            .leftJoin('requests.requester', 'requester')
            .leftJoin('requests.project', 'project')
            .leftJoin('requests.category', 'category')
            .leftJoinAndSelect('requests.tags', 'tags');
        return await queryBuilder.getMany();
    }
    async fetchRequests(userId) {
        const query = this.requestRepository
            .createQueryBuilder('requests')
            .select([
            'requests.id',
            'requests.title',
            'requests.description',
            'requests.dealAmount',
            'requests.deadline',
            'requests.status',
            'requests.createdAt',
            'requests.targetLanguages',
            'requester.id',
            'requester.username',
            'requester.fullName',
            'requester.email',
            'requester.phone',
            'category.name',
            'tags.id',
            'tags.name',
        ])
            .where('requests.isPublic = true')
            .leftJoin('requests.requester', 'requester')
            .leftJoin('requests.category', 'category')
            .leftJoinAndSelect('requests.tags', 'tags')
            .leftJoinAndSelect('requests.registrants', 'registrants');
        const result = await query.getMany();
        if (!result || result.length === 0) {
            throw new common_1.NotFoundException('No requests found');
        }
        return result.map((r) => {
            const isRegistered = r.registrants
                ? r.registrants.some((u) => u.id.toString() === userId.toString())
                : false;
            this.logger.debug(`Request ${r.id}: userId=${userId}, registrants=${r.registrants?.map((u) => u.id)}, isRegistered=${isRegistered}`);
            return {
                ...r,
                isRegistered,
            };
        });
    }
    async fetchPrivateRequests(uid) {
        const query = this.requestRepository
            .createQueryBuilder('requests')
            .select([
            'requests.id',
            'requests.title',
            'requests.description',
            'requests.dealAmount',
            'requests.deadline',
            'requests.status',
            'requests.isPublic',
            'requests.createdAt',
            'requests.targetLanguages',
            'requester.id',
            'requester.fullName',
            'requester.email',
            'requester.phone',
            'category.name',
            'tags.id',
            'tags.name',
        ])
            .where('requests.isPublic = false')
            .andWhere('assigneeId = :uid', { uid: BigInt(uid) })
            .leftJoin('requests.requester', 'requester')
            .leftJoin('requests.category', 'category')
            .leftJoinAndSelect('requests.tags', 'tags');
        const result = await query.getMany();
        // Return empty array instead of throwing exception when no requests found
        return result || [];
    }
    async getMyRegisteredRequests(uid) {
        console.log('🔍 getMyRegisteredRequests called with uid:', uid);
        // Use the old logic for now since we haven't migrated the data yet
        const requests = await this.requestRepository
            .createQueryBuilder('requests')
            .leftJoinAndSelect('requests.registrants', 'registrants')
            .leftJoinAndSelect('requests.requester', 'requester')
            .leftJoinAndSelect('requests.category', 'category')
            .leftJoinAndSelect('requests.tags', 'tags')
            .getMany();
        console.log('🔍 All requests with registrants:', requests.map(r => ({
            id: r.id,
            title: r.title,
            registrantsCount: r.registrants?.length || 0,
            registrantIds: r.registrants?.map(reg => reg.id) || [],
            requester: r.requester ? { id: r.requester.id, fullName: r.requester.fullName, email: r.requester.email } : null,
            category: r.category ? { id: r.category.id, name: r.category.name } : null
        })));
        // Filter requests where the user is a registrant
        const myRegisteredRequests = requests.filter(request => request.registrants?.some(registrant => registrant.id.toString() === uid.toString()));
        console.log('🔍 My registered requests after filtering:', myRegisteredRequests.map(r => ({
            id: r.id,
            title: r.title,
            requester: r.requester?.fullName || r.requester?.email || 'Unknown',
            category: r.category?.name || '-'
        })));
        // Add registrationStatus for frontend compatibility
        const result = myRegisteredRequests.map(request => ({
            ...request,
            registrationStatus: 'PENDING' // Default to PENDING for now
        }));
        return result;
    }
    async fetchRequestDetails(requestId, userId) {
        const query = this.requestRepository
            .createQueryBuilder('requests')
            .select([
            'requests.id',
            'requests.title',
            'requests.description',
            'requests.dealAmount',
            'requests.deadline',
            'requests.status',
            'requests.createdAt',
            'requests.isPublic',
            'requests.targetLanguages',
            'requester.id',
            'requester.username',
            'requester.fullName',
            'requester.email',
            'requester.phone',
            'assignee.id',
            'assignee.username',
            'assignee.fullName',
            'assignee.email',
            'assignee.phone',
            'category.name',
            'tags.id',
            'tags.name',
            'files.id',
            'files.fileName',
            'files.fileType',
            'files.createdAt',
            'files.fileContent',
        ])
            .where('requests.id = :requestId', { requestId })
            .leftJoin('requests.requester', 'requester')
            .leftJoin('requests.assignee', 'assignee')
            .leftJoin('requests.category', 'category')
            .leftJoinAndSelect('requests.tags', 'tags')
            .leftJoinAndSelect('requests.registrants', 'registrants')
            .leftJoinAndSelect('requests.files', 'files');
        const request = await query.getOne();
        let isRegistered = false;
        if (request?.registrants) {
            isRegistered = request.registrants.some((u) => u.id.toString() === userId.toString());
        }
        return { ...request, isRegistered };
    }
    async updateRequest(uid, requestId, data) {
        const { title, description, dealAmount, deadline, categoryId, tags, files, status, } = data;
        const DAY = 24 * 60 * 60 * 1000;
        if (!title &&
            !description &&
            !dealAmount &&
            !deadline &&
            !categoryId &&
            !tags &&
            status === undefined &&
            (!files || files.length === 0)) {
            throw new common_1.BadRequestException(`No fields to update`);
        }
        const request = await this.requestRepository.findOne({
            where: { id: BigInt(requestId) },
            relations: ['requester', 'category', 'tags'],
        });
        if (!request)
            throw new common_1.NotFoundException(`Unknown request`);
        if (request.requester.id !== uid)
            throw new common_1.BadRequestException(`You are not the creator of this request`);
        if (request.status !== Entities_1.RequestStatus.Pending)
            throw new common_1.BadRequestException(`Request is not in pending status`);
        if (deadline) {
            const datelineValue = new Date(deadline);
            if (datelineValue.getTime() - Date.now() < 7 * DAY) {
                throw new common_1.BadRequestException(`Deadline has to be at least 7 days from the current date`);
            }
            request.deadline = datelineValue;
        }
        if (title)
            request.title = title;
        if (description)
            request.description = description;
        if (dealAmount)
            request.dealAmount = dealAmount;
        if (categoryId) {
            const category = await this.categoryRepository.findOne({
                where: { id: BigInt(categoryId) },
            });
            if (!category)
                throw new common_1.BadRequestException(`Category not found`);
            request.category = category;
        }
        if (tags !== undefined) {
            const requestTags = [];
            for (const tag of tags) {
                let tagEntity = await this.projectTagRepository.findOne({
                    where: { name: tag },
                });
                if (!tagEntity) {
                    const newTag = this.projectTagRepository.create({ name: tag });
                    tagEntity = await this.projectTagRepository.save(newTag);
                }
                requestTags.push(tagEntity);
            }
            request.tags = requestTags;
        }
        if (files && files.length > 0) {
            for (const file of files) {
                await this.fileService.saveFile({
                    uid,
                    fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
                    fileType: file.mimetype,
                    fileContent: file.buffer,
                    requestId,
                });
            }
        }
        return this.requestRepository.save(request);
    }
    async cancelRequest(uid, requestId) {
        const request = await this.requestRepository.findOne({
            where: { id: BigInt(requestId) },
            relations: ['requester'],
        });
        if (!request) {
            throw new common_1.NotFoundException(`Unknown request`);
        }
        if (request.requester.id !== uid) {
            throw new common_1.BadRequestException(`You are not the requester of this request`);
        }
        if (request.status !== Entities_1.RequestStatus.Pending) {
            throw new common_1.BadRequestException(`Request is not in pending status`);
        }
        // If it's a private request, refund the deposit
        if (!request.isPublic) {
            const transaction = await this.transactionRepository.findOne({
                where: {
                    request: { id: requestId },
                    user: { id: request.requester.id },
                    status: Entities_1.TransactionStatus.Pending,
                },
            });
            if (transaction) {
                const wallet = await this.walletService.getOrCreateWallet(request.requester.id);
                wallet.balance = Number(wallet.balance) + Number(transaction.amount);
                transaction.status = Entities_1.TransactionStatus.Failed;
                await this.transactionRepository.save(transaction);
                await this.walletRepository.save(wallet);
                logger_1.logger.log(`Refunded $${transaction.amount} to user ID ${request.requester.id} for canceled private request ID ${request.id}`);
            }
            else {
                logger_1.logger.warn(`No pending deposit transaction found for private request ID ${request.id} and user ID ${request.requester.id}`);
            }
        }
        request.status = Entities_1.RequestStatus.Cancelled;
        await this.requestRepository.save(request);
        logger_1.logger.log(`Request ID ${request.id} cancelled by user ID ${uid}`);
        return request;
    }
    async registerForPublicRequest(requestId, uid) {
        const request = await this.requestRepository.findOneOrFail({
            where: { id: requestId },
            relations: ['requester'],
        });
        const register = await this.userRepository.findOneOrFail({
            where: { id: BigInt(uid) },
        });
        if (request.requester && request.requester.id === BigInt(uid)) {
            throw new common_1.BadRequestException('You cannot register for your own request.');
        }
        if (request.status !== Entities_1.RequestStatus.Pending) {
            throw new common_1.BadRequestException('Request is not open for registration.');
        }
        // Check if user already registered using new entity
        const existingRegistration = await this.requestRegistrationRepository.findOne({
            where: {
                request: { id: requestId },
                user: { id: BigInt(uid) }
            }
        });
        if (existingRegistration) {
            throw new common_1.BadRequestException('You have already registered for this request.');
        }
        // Create new registration record
        const registration = this.requestRegistrationRepository.create({
            request: { id: requestId },
            user: { id: BigInt(uid) },
            status: Entities_2.RegistrationStatus.Pending
        });
        await this.requestRegistrationRepository.save(registration);
        // Also update the old registrants array for backward compatibility
        if (!request.registrants)
            request.registrants = [];
        if (!request.registrants.some((u) => u.id === register.id)) {
            request.registrants.push(register);
            await this.requestRepository.save(request);
        }
        // Create notification for requester about new registration
        await this.notificationService.createNotification({
            userId: request.requester.id,
            type: 'PUBLIC_REQUEST_REGISTERED',
            message: `${register.fullName || register.username} has registered for your public request: "${request.title}"`,
            createdBy: BigInt(uid),
        });
        const requesterEmail = request.requester.email;
        await this.mailService.notifyRequesterOfRegistration(requesterEmail, register.username);
        if (request.requester) {
            await this.chatService.openChatBetween({ id: uid, username: register.username }, {
                id: Number(request.requester.id),
                username: request.requester.username,
            });
        }
    }
    async getRequestRegistrants(requestId) {
        const request = await this.requestRepository.findOneOrFail({
            where: { id: requestId },
            relations: ['registrants'],
        });
        const registrantIds = request.registrants.map((r) => r.id);
        if (registrantIds.length === 0)
            return [];
        return this.userRepository
            .createQueryBuilder('user')
            .select([
            'user.id',
            'user.fullName',
            'user.email',
            'user.phone',
            'user.createdAt',
        ])
            .whereInIds(registrantIds)
            .getMany();
    }
    async approveRegistrant(requestId, selectedUserId) {
        try {
            console.log(`Approving registrant: requestId=${requestId}, userId=${selectedUserId}`);
            const request = await this.requestRepository.findOneOrFail({
                where: { id: BigInt(requestId) },
                relations: ['requester', 'assignee', 'registrants', 'category'],
            });
            console.log('Found request:', {
                id: request.id,
                title: request.title,
                status: request.status,
                isPublic: request.isPublic,
                hasAssignee: !!request.assignee,
                registrantsCount: request.registrants?.length || 0
            });
            if (request.assignee) {
                throw new common_1.BadRequestException('Request has already been assigned.');
            }
            const selectedUser = await this.userRepository.findOneOrFail({
                where: { id: BigInt(selectedUserId) },
            });
            console.log('Found selected user:', {
                id: selectedUser.id,
                username: selectedUser.username,
                email: selectedUser.email
            });
            const approvalUrl = await this.paymentService.createDeposit(request.dealAmount, selectedUser, request);
            if (!approvalUrl) {
                throw new Error('Failed to generate PayPal approval URL.');
            }
            console.log('Generated approval URL successfully');
            return { approvalUrl };
        }
        catch (error) {
            console.error('Error in approveRegistrant:', error);
            throw error;
        }
    }
    async declinePrivateRequest(requestId) {
        const request = await this.requestRepository.findOneOrFail({
            where: { id: requestId },
            relations: ['requester'],
        });
        if (request.status !== Entities_1.RequestStatus.Pending || request.isPublic) {
            throw new common_1.BadRequestException('Only private and pending requests can be declined');
        }
        const transaction = await this.transactionRepository.findOne({
            where: {
                request: { id: requestId },
                user: { id: request.requester.id },
                status: Entities_1.TransactionStatus.Pending,
            },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('No matching deposit transaction found');
        }
        const wallet = await this.walletService.getOrCreateWallet(request.requester.id);
        wallet.balance = Number(wallet.balance) + Number(transaction.amount);
        transaction.status = Entities_1.TransactionStatus.Failed;
        request.status = Entities_1.RequestStatus.Rejected;
        await this.transactionRepository.save(transaction);
        await this.walletRepository.save(wallet);
        await this.requestRepository.save(request);
        // Create notification for requester about declined private request
        await this.notificationService.createNotification({
            userId: request.requester.id,
            type: 'PRIVATE_REQUEST_DECLINED',
            message: `Your private request "${request.title}" has been declined by the assigned translator.`,
            createdBy: request.assignee?.id || BigInt(0),
        });
        return true;
    }
    async acceptPrivateRequest(requestId, assigneeId) {
        const request = await this.requestRepository.findOneOrFail({
            where: { id: requestId },
            relations: ['assignee', 'requester', 'category', 'files'],
        });
        if (!request || request.isPublic || request.status !== Entities_1.RequestStatus.Pending) {
            throw new common_1.BadRequestException('Invalid request for acceptance');
        }
        if (Number(request.assignee?.id) !== Number(assigneeId)) {
            throw new common_1.BadRequestException('You are not the assigned translator for this request');
        }
        const queryRunner = this.projectService['dataSource'].createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const { projectId } = await this.projectService.createProjectFromRequest(request, assigneeId);
            const newProject = await this.projectRepository.findOneOrFail({
                where: { id: projectId },
            });
            request.project = newProject;
            request.status = Entities_1.RequestStatus.Approved;
            await queryRunner.manager.save(request);
            await queryRunner.commitTransaction();
            // Create notification for requester about accepted private request
            await this.notificationService.createNotification({
                userId: request.requester.id,
                type: 'PRIVATE_REQUEST_ACCEPTED',
                message: `Your private request "${request.title}" has been accepted and a project has been created!`,
                createdBy: assigneeId,
            });
            return {
                success: true,
                message: 'Private request accepted and project created.',
                projectId,
                requestId: request.id,
            };
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
            console.error('Accept private request failed:', err);
            throw new common_1.InternalServerErrorException('Failed to accept private request');
        }
        finally {
            await queryRunner.release();
        }
    }
    async getPendingRequestsCount() {
        return 'count';
    }
};
exports.RequestManagerService = RequestManagerService;
exports.RequestManagerService = RequestManagerService = RequestManagerService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_2.InjectRepository)(Entities_1.RequestEntity)),
    tslib_1.__param(1, (0, typeorm_2.InjectRepository)(Entities_1.UserEntity)),
    tslib_1.__param(2, (0, typeorm_2.InjectRepository)(Entities_1.ProjectEntity)),
    tslib_1.__param(2, (0, typeorm_2.InjectRepository)(Entities_1.CategoryEntity)),
    tslib_1.__param(3, (0, typeorm_2.InjectRepository)(Entities_1.ProjectTagEntity)),
    tslib_1.__param(4, (0, typeorm_2.InjectRepository)(Entities_1.TransactionEntity)),
    tslib_1.__param(5, (0, typeorm_2.InjectRepository)(Entities_1.WalletEntity)),
    tslib_1.__param(6, (0, typeorm_2.InjectRepository)(Entities_1.FileEntity)),
    tslib_1.__param(7, (0, typeorm_2.InjectRepository)(Entities_1.ProjectEntity)),
    tslib_1.__param(8, (0, typeorm_2.InjectRepository)(Entities_2.RequestRegistrationEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _c : Object, typeof (_d = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _d : Object, typeof (_e = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _e : Object, typeof (_f = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _f : Object, typeof (_g = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _g : Object, typeof (_h = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _h : Object, typeof (_j = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _j : Object, typeof (_k = typeof wallet_manager_service_1.WalletManagerService !== "undefined" && wallet_manager_service_1.WalletManagerService) === "function" ? _k : Object, typeof (_l = typeof mailer_service_1.MailService !== "undefined" && mailer_service_1.MailService) === "function" ? _l : Object, typeof (_m = typeof chat_service_1.ChatService !== "undefined" && chat_service_1.ChatService) === "function" ? _m : Object, typeof (_o = typeof payment_manager_service_1.PaypalService !== "undefined" && payment_manager_service_1.PaypalService) === "function" ? _o : Object, typeof (_p = typeof file_manager_service_1.FileService !== "undefined" && file_manager_service_1.FileService) === "function" ? _p : Object, typeof (_q = typeof project_manager_service_1.ProjectManagerService !== "undefined" && project_manager_service_1.ProjectManagerService) === "function" ? _q : Object, typeof (_r = typeof notification_manager_service_1.NotificationManagerService !== "undefined" && notification_manager_service_1.NotificationManagerService) === "function" ? _r : Object])
], RequestManagerService);


/***/ }),
/* 83 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MailService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const mailer_1 = __webpack_require__(49);
let MailService = class MailService {
    constructor(mailerService) {
        this.mailerService = mailerService;
    }
    async sendPrivateRequestConfirmation(to, requestData) {
        await this.mailerService.sendMail({
            to,
            subject: 'Private Request Confirmation',
            template: './private-request-confirmation',
            context: {
                title: requestData.title,
                deadline: requestData.deadline.toDateString(),
                username: requestData.username,
            },
        });
    }
    async notifyRequesterOfRegistration(to, username) {
        await this.mailerService.sendMail({
            to,
            subject: 'Registration',
            template: './register-request',
            context: {
                username,
            }
        });
    }
    async notifyAllOthersRequestTaken(requestId, userIds) {
        // TODO: Implement actual mail notification logic for all other registrants
        return;
    }
    async sendProjectInvitation(to, invitationData) {
        console.log('📧 MailService.sendProjectInvitation called with:', {
            to,
            invitationData
        });
        try {
            await this.mailerService.sendMail({
                to,
                subject: `You're invited to join project: ${invitationData.projectName}`,
                template: './project-invitation',
                context: {
                    projectName: invitationData.projectName,
                    invitedByUsername: invitationData.invitedByUsername,
                    message: invitationData.message || `You're invited to join the project ${invitationData.projectName}.`,
                    projectId: invitationData.projectId,
                    expiresIn: invitationData.expiresIn,
                },
            });
            console.log('📧 MailService.sendProjectInvitation completed successfully');
        }
        catch (error) {
            console.error('📧 MailService.sendProjectInvitation error:', error);
            throw error;
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof mailer_1.MailerService !== "undefined" && mailer_1.MailerService) === "function" ? _a : Object])
], MailService);


/***/ }),
/* 84 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatService = void 0;
const tslib_1 = __webpack_require__(1);
const chat_message_schema_1 = __webpack_require__(85);
const mongoose_1 = __webpack_require__(42);
const mongoose_2 = __webpack_require__(41);
const chat_room_schema_1 = __webpack_require__(86);
const common_1 = __webpack_require__(2);
const user_manager_service_1 = __webpack_require__(87);
let ChatService = class ChatService {
    constructor(chatMessageModel, chatRoomModel, userService) {
        this.chatMessageModel = chatMessageModel;
        this.chatRoomModel = chatRoomModel;
        this.userService = userService;
    }
    async createMessage(data) {
        const msg = new this.chatMessageModel({
            roomId: new mongoose_1.Types.ObjectId(data.roomId),
            senderId: data.senderId,
            message: data.message,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            replyTo: data.replyToId ? new mongoose_1.Types.ObjectId(data.replyToId) : null,
        });
        return msg.save();
    }
    async getMessages(roomId) {
        const messages = await this.chatMessageModel
            .find({ roomId })
            .sort({ createdAt: 1 })
            .populate('replyTo', 'message senderId')
            .lean();
        const senderIds = [...new Set(messages.map((msg) => msg.senderId))];
        const users = await this.userService.findUsersByIds(senderIds);
        const userMap = new Map();
        for (const user of users) {
            userMap.set(Number(user.id), user.username);
        }
        return messages.map((msg) => ({
            _id: msg._id.toString(),
            roomId: msg.roomId.toString(),
            senderId: msg.senderId,
            senderUsername: userMap.get(msg.senderId) || 'Unknown',
            message: msg.message,
            isEdited: msg.isEdited ?? false,
            fileUrl: msg.fileUrl || null,
            fileName: msg.fileName || null,
            createdAt: msg.createdAt
                ? new Date(msg.createdAt).toISOString()
                : null,
            replyTo: msg.replyTo ? {
                _id: msg.replyTo._id.toString(),
                message: msg.replyTo.message,
                senderId: msg.replyTo.senderId,
                senderUsername: userMap.get(msg.replyTo.senderId) || 'Unknown',
            } : null,
        }));
    }
    async renameRoom(id, name) {
        return this.chatRoomModel.findByIdAndUpdate(id, { name }, { new: true });
    }
    async createGroupRoom(name, creatorId, participants) {
        if (!participants.includes(creatorId))
            participants.push(creatorId);
        const createdRoom = await this.chatRoomModel.create({
            name,
            participants,
            isGroupChat: true,
            createdBy: creatorId,
        });
        const room = await this.chatRoomModel.findById(createdRoom._id).lean();
        return room;
    }
    async deleteRoom(id) {
        return this.chatRoomModel.findByIdAndDelete(id);
    }
    async getChatRoomsForUser(userId) {
        const rooms = await this.chatRoomModel
            .find({ participants: userId })
            .lean()
            .exec();
        return await Promise.all(rooms.map(async (room) => {
            let oppositeUser = null;
            if (!room.isGroupChat) {
                const otherId = room.participants.find((id) => id !== userId);
                if (otherId != null) {
                    oppositeUser = await this.userService.findUserById(otherId);
                }
            }
            return {
                _id: room._id.toString(),
                name: room.name,
                isGroupChat: room.isGroupChat,
                participants: room.participants,
                createdBy: room.createdBy,
                oppositeUser,
            };
        }));
    }
    async openChatBetween(userA, userB) {
        const participantIds = [userA.id, userB.id].sort((a, b) => a - b);
        let room = await this.chatRoomModel
            .findOne({ participants: participantIds, isGroupChat: false })
            .lean()
            .exec();
        if (!room) {
            const createdRoom = await this.chatRoomModel.create({
                participants: participantIds,
                name: `${userB.username}`,
                isGroupChat: false,
                createdBy: userA.id,
            });
            room = await this.chatRoomModel.findById(createdRoom._id).lean().exec();
        }
        return {
            ...room,
            _id: room?._id?.toString(),
        };
    }
    async editMessage(id, newContent) {
        const message = await this.chatMessageModel.findById(id);
        if (!message)
            throw new common_1.NotFoundException('Message not found');
        message.message = newContent;
        message.isEdited = true;
        await message.save();
        return {
            _id: message._id.toString(),
            roomId: message.roomId.toString(),
            senderId: message.senderId,
            message: message.message,
            isEdited: message.isEdited,
            createdAt: message.createdAt?.toISOString?.(),
        };
    }
    async deleteMessage(id) {
        const result = await this.chatMessageModel.findByIdAndDelete(id);
        if (!result) {
            throw new common_1.NotFoundException('Message not found');
        }
        return { deleted: true, _id: id };
    }
    async findMessageById(messageId) {
        const doc = await this.chatMessageModel.findById(messageId).lean();
        if (!doc)
            return null;
        let senderUsername = 'Unknown';
        try {
            const users = await this.userService.findUsersByIds([doc.senderId]);
            if (users && users.length > 0) {
                senderUsername = users[0].username;
            }
        }
        catch (err) {
            console.error('⚠️ Failed to fetch username for replyTo:', err);
        }
        return {
            _id: doc._id,
            message: doc.message,
            senderId: doc.senderId,
            senderUsername,
        };
    }
    async addMemberToRoom(roomId, userId) {
        const room = await this.chatRoomModel.findById(roomId);
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        if (room.participants.includes(userId)) {
            throw new common_1.BadRequestException('Cannot invite invited user');
        }
        room.participants.push(userId);
        if (!room.isGroupChat && room.participants.length > 2) {
            room.isGroupChat = true;
        }
        await room.save();
        return room.toObject();
    }
    async removeMemberFromRoom(roomId, creatorId, userId) {
        const room = await this.chatRoomModel.findById(roomId);
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        if (room.createdBy !== creatorId) {
            throw new common_1.BadRequestException('Only the room creator can remove members.');
        }
        if (userId === creatorId) {
            throw new common_1.BadRequestException('Creator cannot be removed.');
        }
        room.participants = room.participants.filter((id) => id !== userId);
        await room.save();
        return { success: true, removedUserId: userId };
    }
    async getParticipants(roomId) {
        const room = await this.chatRoomModel.findById(roomId).lean();
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        const users = await this.userService.findUsersByIds(room.participants);
        return {
            createdBy: room.createdBy,
            participants: users.map(u => ({
                id: Number(u.id),
                username: u.username,
                email: u.email,
                phone: u.phone,
            })),
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, mongoose_2.InjectModel)(chat_message_schema_1.ChatMessage.name)),
    tslib_1.__param(1, (0, mongoose_2.InjectModel)(chat_room_schema_1.ChatRoom.name)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof mongoose_1.Model !== "undefined" && mongoose_1.Model) === "function" ? _a : Object, typeof (_b = typeof mongoose_1.Model !== "undefined" && mongoose_1.Model) === "function" ? _b : Object, typeof (_c = typeof user_manager_service_1.UserManagerService !== "undefined" && user_manager_service_1.UserManagerService) === "function" ? _c : Object])
], ChatService);


/***/ }),
/* 85 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatMessageSchema = exports.ChatMessage = void 0;
const tslib_1 = __webpack_require__(1);
const mongoose_1 = __webpack_require__(41);
const mongoose_2 = __webpack_require__(42);
let ChatMessage = class ChatMessage {
};
exports.ChatMessage = ChatMessage;
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'ChatRoom', required: true }),
    tslib_1.__metadata("design:type", typeof (_a = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _a : Object)
], ChatMessage.prototype, "roomId", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    tslib_1.__metadata("design:type", Number)
], ChatMessage.prototype, "senderId", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({
        required: function () {
            return !this.fileUrl;
        },
    }),
    tslib_1.__metadata("design:type", String)
], ChatMessage.prototype, "message", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    tslib_1.__metadata("design:type", Boolean)
], ChatMessage.prototype, "isEdited", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)(),
    tslib_1.__metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], ChatMessage.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'ChatMessage', default: null }),
    tslib_1.__metadata("design:type", typeof (_c = typeof mongoose_2.Types !== "undefined" && mongoose_2.Types.ObjectId) === "function" ? _c : Object)
], ChatMessage.prototype, "replyTo", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    tslib_1.__metadata("design:type", String)
], ChatMessage.prototype, "senderUsername", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    tslib_1.__metadata("design:type", String)
], ChatMessage.prototype, "fileUrl", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    tslib_1.__metadata("design:type", String)
], ChatMessage.prototype, "fileName", void 0);
exports.ChatMessage = ChatMessage = tslib_1.__decorate([
    (0, mongoose_1.Schema)({ timestamps: { createdAt: true, updatedAt: false } })
], ChatMessage);
exports.ChatMessageSchema = mongoose_1.SchemaFactory.createForClass(ChatMessage);
exports.ChatMessageSchema.index({ roomId: 1, createdAt: 1 });


/***/ }),
/* 86 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatRoomSchema = exports.ChatRoom = void 0;
const tslib_1 = __webpack_require__(1);
const mongoose_1 = __webpack_require__(41);
let ChatRoom = class ChatRoom {
};
exports.ChatRoom = ChatRoom;
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: [Number], required: true }),
    tslib_1.__metadata("design:type", Array)
], ChatRoom.prototype, "participants", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    tslib_1.__metadata("design:type", String)
], ChatRoom.prototype, "name", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    tslib_1.__metadata("design:type", Boolean)
], ChatRoom.prototype, "isGroupChat", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    tslib_1.__metadata("design:type", Number)
], ChatRoom.prototype, "createdBy", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)(),
    tslib_1.__metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], ChatRoom.prototype, "createdAt", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    tslib_1.__metadata("design:type", String)
], ChatRoom.prototype, "avatar", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    tslib_1.__metadata("design:type", String)
], ChatRoom.prototype, "description", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)(),
    tslib_1.__metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], ChatRoom.prototype, "updatedAt", void 0);
exports.ChatRoom = ChatRoom = tslib_1.__decorate([
    (0, mongoose_1.Schema)({ timestamps: { createdAt: true, updatedAt: false } })
], ChatRoom);
exports.ChatRoomSchema = mongoose_1.SchemaFactory.createForClass(ChatRoom);
exports.ChatRoomSchema.index({ participants: 1, isGroupChat: 1 }, { unique: true, partialFilterExpression: { isGroupChat: false } });


/***/ }),
/* 87 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserManagerService = void 0;
const tslib_1 = __webpack_require__(1);
const Entities_1 = __webpack_require__(16);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(15);
const bcrypt = tslib_1.__importStar(__webpack_require__(46));
const validation_1 = __webpack_require__(79);
const typeorm_2 = __webpack_require__(10);
let UserManagerService = class UserManagerService {
    constructor(userRepository, roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }
    async register(data) {
        const { username, email, phone } = data;
        const existingUsername = await this.userRepository.exists({
            where: { username },
        });
        if (existingUsername) {
            throw new common_1.ConflictException('Username already exists');
        }
        const existingEmail = await this.userRepository.exists({
            where: { email },
        });
        if (existingEmail) {
            throw new common_1.ConflictException('Email already exists');
        }
        const existingPhone = await this.userRepository.findOne({
            where: { phone },
        });
        if (existingPhone) {
            throw new common_1.ConflictException('Phone number already exists');
        }
        // Validate email domain
        const isEmailValid = await (0, validation_1.validateEmail)(email);
        if (!isEmailValid) {
            throw new common_1.BadRequestException('Invalid email domain');
        }
        const passwordHash = await bcrypt.hash(data.password, 10);
        const memberRole = await this.roleRepository.findOneOrFail({
            where: { id: '3' },
        });
        const user = this.userRepository.create({
            ...data,
            passwordHash,
            role: memberRole,
        });
        await this.userRepository.save(user);
        return { message: 'Registration successful' };
    }
    async updateProfile(userId, updateData) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('Unknown user');
        }
        if (updateData.phone && updateData.phone !== user.phone) {
            const existingUser = await this.userRepository.findOne({
                where: { phone: updateData.phone },
            });
            if (existingUser) {
                throw new common_1.BadRequestException('Phone number already in use');
            }
        }
        Object.assign(user, updateData);
        return this.userRepository.save(user);
    }
    async getUserProfile(uid) {
        const user = await this.userRepository.findOne({
            where: { id: uid },
            relations: ['role'],
            select: [
                'id',
                'username',
                'email',
                'phone',
                'fullName',
                'role',
                'createdProjects',
                'avatarUrl',
            ],
        });
        if (!user) {
            throw new common_1.NotFoundException('Unknown user');
        }
        return user;
    }
    async findUsersByIds(ids) {
        return this.userRepository.find({
            where: { id: (0, typeorm_1.In)(ids) },
            select: ['id', 'username', 'email', 'phone'],
        });
    }
    async deleteUser(uid) {
        const user = await this.userRepository.findOne({
            where: { id: uid },
        });
        if (!user) {
            throw new common_1.BadRequestException('Unknown user');
        }
        await this.userRepository.remove(user);
        return { message: 'User deleted successfully' };
    }
    async changePassword(userId, data) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('Unknown user');
        }
        const { currentPassword, newPassword } = data;
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.BadRequestException('Current password is incorrect');
        }
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        return this.userRepository.save(user);
    }
    async getAllUsers() {
        return this.userRepository.find({
            relations: ['role'],
            select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                fullName: true,
                isActive: true,
                createdAt: true,
                avatarUrl: true, // ✅ Thêm dòng này
                role: {
                    id: true,
                    name: true,
                },
            },
        });
    }
    async updateUserRole(userId, roleId, currentUser) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['role'],
        });
        if (!user) {
            throw new common_1.NotFoundException('Unknown user');
        }
        if (user.id === currentUser.user.id) {
            throw new common_1.BadRequestException('You cannot change your own role');
        }
        if (roleId === Entities_1.UserRole.Admin &&
            currentUser.user.role !== Entities_1.UserRole.SuperAdmin) {
            throw new common_1.BadRequestException('Only super admins can assign admin roles');
        }
        if (user.role.id === '2' && currentUser.user.role !== Entities_1.UserRole.SuperAdmin) {
            throw new common_1.BadRequestException('Only super admins can modify admin roles');
        }
        if (roleId === Entities_1.UserRole.SuperAdmin) {
            throw new common_1.BadRequestException('Super admin role cannot be assigned');
        }
        const newRole = await this.roleRepository.findOneBy({
            id: roleId.toString(),
        });
        if (!newRole) {
            throw new common_1.NotFoundException('Role not found');
        }
        user.role = newRole;
        await this.userRepository.save(user);
        return this.userRepository.findOne({
            where: { id: userId },
            relations: ['role'],
        });
    }
    async searchByEmailOrUsername(identifier) {
        return this.userRepository.findOne({
            where: [{ email: identifier }, { username: identifier }],
            select: ['id', 'username', 'email'],
        });
    }
    async toggleUserStatus(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('Unknown user');
        }
        user.isActive = !user.isActive;
        return this.userRepository.save(user);
    }
    async findUserById(userId) {
        const user = await this.userRepository.findOne({
            where: { id: BigInt(userId) },
            select: ['id', 'username'],
        });
        if (!user)
            return null;
        return {
            id: Number(user.id),
            username: user.username,
        };
    }
    async searchUsers(search) {
        const queryBuilder = this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.role', 'role')
            .where('role.id != :superAdminRoleId', {
            superAdminRoleId: Entities_1.UserRole.SuperAdmin,
        })
            .andWhere('user.isActive = :isActive', { isActive: true });
        if (search) {
            queryBuilder.andWhere('(LOWER(user.fullName) LIKE :search OR LOWER(user.username) LIKE :search OR LOWER(user.email) LIKE :search)', { search: `%${search.toLowerCase()}%` });
        }
        return queryBuilder
            .select([
            'user.id',
            'user.username',
            'user.fullName',
            'user.email',
            'role.id',
            'role.name',
        ])
            .orderBy('user.fullName', 'ASC')
            .getMany();
    }
    async updateAvatar(userId, avatarUrl) {
        await this.userRepository.update(Number(userId), { avatarUrl });
    }
};
exports.UserManagerService = UserManagerService;
exports.UserManagerService = UserManagerService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_2.InjectRepository)(Entities_1.UserEntity)),
    tslib_1.__param(1, (0, typeorm_2.InjectRepository)(Entities_1.UserTypeEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _b : Object])
], UserManagerService);


/***/ }),
/* 88 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PaypalService = void 0;
const tslib_1 = __webpack_require__(1);
const axios_1 = tslib_1.__importDefault(__webpack_require__(89));
const common_1 = __webpack_require__(2);
const Entities_1 = __webpack_require__(16);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(15);
const project_manager_service_1 = __webpack_require__(90);
const mailer_service_1 = __webpack_require__(83);
const Entities_2 = __webpack_require__(16);
const wallet_manager_service_1 = __webpack_require__(98);
const logger_1 = __webpack_require__(73);
const manifest_service_1 = __webpack_require__(99);
const fee_manager_service_1 = __webpack_require__(106);
const notification_manager_service_1 = __webpack_require__(94);
let PaypalService = class PaypalService {
    constructor(transactionRepo, projectRepository, requestRepository, translationApprovalRepository, walletRepository, userRepository, projectService, mailService, walletManagerService, manifestService, feeService, notificationService) {
        this.transactionRepo = transactionRepo;
        this.projectRepository = projectRepository;
        this.requestRepository = requestRepository;
        this.translationApprovalRepository = translationApprovalRepository;
        this.walletRepository = walletRepository;
        this.userRepository = userRepository;
        this.projectService = projectService;
        this.mailService = mailService;
        this.walletManagerService = walletManagerService;
        this.manifestService = manifestService;
        this.feeService = feeService;
        this.notificationService = notificationService;
        this.api = process.env.PAYPAL_API;
        this.ADMIN_USER_ID = 1n; // use config/env if preferred
    }
    async getAccessToken() {
        if (this.accessToken)
            return this.accessToken;
        const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
        try {
            const res = await axios_1.default.post(`${this.api}/v1/oauth2/token`, 'grant_type=client_credentials', {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            this.accessToken = res.data.access_token;
            return this.accessToken;
        }
        catch (err) {
            console.error(err);
            throw new common_1.InternalServerErrorException('Failed to authenticate with PayPal');
        }
    }
    async createDeposit(amount, user, request) {
        const baseAmount = typeof amount === 'number' ? amount : parseFloat(amount);
        if (isNaN(baseAmount)) {
            throw new common_1.BadRequestException('Invalid amount for PayPal deposit');
        }
        const depositAmount = parseFloat((baseAmount * 0.5).toFixed(2));
        const accessToken = await this.getAccessToken();
        try {
            // let locationEn = 'N/A';
            // if (user.location) {
            //   if (user.location.toLowerCase().includes('hà nội'))
            //     locationEn = 'Hanoi';
            //   else if (
            //     user.location.toLowerCase().includes('hcm') ||
            //     user.location.toLowerCase().includes('hồ chí minh')
            //   )
            //     locationEn = 'Ho Chi Minh City';
            // }
            const { data } = await axios_1.default.post(`${this.api}/v2/checkout/orders`, {
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: 'USD',
                            value: depositAmount.toFixed(2),
                        },
                        description: `50% Deposit for request ID ${request.id}`,
                        shipping: {
                            name: {
                                full_name: user.fullName || user.username || user.email, // Giữ nguyên tên
                            },
                            address: {
                                address_line_1: user.email, // Email luôn là tiếng Anh
                                // admin_area_2: locationEn, // Thành phố tiếng Anh
                                admin_area_1: '',
                                postal_code: '000000',
                                country_code: 'VN',
                            },
                            phone: user.phone || '',
                        },
                    },
                ],
                application_context: {
                    return_url: `${process.env.CLIENT_URL || 'http://localhost:4200'}/paypal-success`,
                    cancel_url: `${process.env.CLIENT_URL || 'http://localhost:4200'}/paypal/cancel`,
                    shipping_preference: 'SET_PROVIDED_ADDRESS',
                    brand_name: 'HereToTranslate',
                    user_action: 'PAY_NOW',
                },
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const approvalUrl = data.links?.find((link) => link.rel === 'approve')?.href;
            if (!approvalUrl) {
                throw new common_1.InternalServerErrorException('No approval URL returned by PayPal.');
            }
            logger_1.logger.log('🔄 Creating requester transaction in createDeposit:', {
                userId: user.id,
                userEmail: user.email,
                requestId: request.id,
                requestDescription: request.description,
                amount: depositAmount,
                paypalOrderId: data.id,
            });
            console.log('🔄 About to save requester transaction to database:', {
                userId: user.id,
                userEmail: user.email,
                requestId: request.id,
                amount: depositAmount,
                status: Entities_1.TransactionStatus.Pending,
                paypalOrderId: data.id,
            });
            const requesterTransaction = await this.transactionRepo.save({
                user,
                request,
                amount: depositAmount,
                status: Entities_1.TransactionStatus.Pending,
                paypalOrderId: data.id,
            });
            console.log('✅ Successfully saved requester transaction to database:', {
                id: requesterTransaction.id,
                userId: requesterTransaction.user?.id,
                requestId: requesterTransaction.request?.id,
                amount: requesterTransaction.amount,
                status: requesterTransaction.status,
                paypalOrderId: requesterTransaction.paypalOrderId,
                userEmail: requesterTransaction.user?.email,
                requestDescription: requesterTransaction.request?.description,
                createdAt: requesterTransaction.createdAt,
            });
            logger_1.logger.log('✅ Created requester transaction in createDeposit:', {
                id: requesterTransaction.id,
                userId: requesterTransaction.user?.id,
                requestId: requesterTransaction.request?.id,
                amount: requesterTransaction.amount,
                status: requesterTransaction.status,
                paypalOrderId: requesterTransaction.paypalOrderId,
                userEmail: requesterTransaction.user?.email,
                requestDescription: requesterTransaction.request?.description,
                type: 'Deposit', // Thêm type để debug
            });
            return approvalUrl;
        }
        catch (err) {
            if (axios_1.default.isAxiosError(err)) {
                console.error('PayPal API error:', {
                    status: err.response?.status,
                    data: err.response?.data,
                    message: err.message,
                });
            }
            else {
                console.error('Unexpected error:', err);
            }
            throw new common_1.InternalServerErrorException('Failed to create PayPal deposit');
        }
    }
    async createPrivateDeposit(amount, user, request) {
        const baseAmount = typeof amount === 'number' ? amount : parseFloat(amount);
        if (isNaN(baseAmount)) {
            throw new common_1.BadRequestException('Invalid amount for PayPal deposit');
        }
        const depositAmount = parseFloat((baseAmount * 0.5).toFixed(2));
        const accessToken = await this.getAccessToken();
        try {
            const { data } = await axios_1.default.post(`${this.api}/v2/checkout/orders`, {
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: 'USD',
                            value: depositAmount.toFixed(2),
                        },
                        description: `50% Deposit (5% fee included) for request ID ${request.id}`,
                    },
                ],
                application_context: {
                    return_url: `${process.env.CLIENT_URL || 'http://localhost:4200'}/paypal-success`,
                    cancel_url: `${process.env.CLIENT_URL || 'http://localhost:4200'}/paypal/cancel`,
                },
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const approvalUrl = data.links?.find((link) => link.rel === 'approve')?.href;
            if (!approvalUrl) {
                throw new common_1.InternalServerErrorException('No approval URL returned by PayPal.');
            }
            console.log('🔄 About to save requester transaction in createPrivateDeposit:', {
                userId: user.id,
                userEmail: user.email,
                requestId: request.id,
                amount: depositAmount,
                status: Entities_1.TransactionStatus.Pending,
                paypalOrderId: data.id,
            });
            const requesterTransaction = await this.transactionRepo.save({
                user,
                request,
                amount: depositAmount, // ✅ SỬA LẠI: Requester deposit nên amount > 0
                status: Entities_1.TransactionStatus.Pending,
                paypalOrderId: data.id,
            });
            console.log('✅ Successfully saved requester transaction in createPrivateDeposit:', {
                id: requesterTransaction.id,
                userId: requesterTransaction.user?.id,
                requestId: requesterTransaction.request?.id,
                amount: requesterTransaction.amount,
                status: requesterTransaction.status,
                paypalOrderId: requesterTransaction.paypalOrderId,
                userEmail: requesterTransaction.user?.email,
                requestDescription: requesterTransaction.request?.description,
                createdAt: requesterTransaction.createdAt,
            });
            return approvalUrl;
        }
        catch (err) {
            if (axios_1.default.isAxiosError(err)) {
                console.error('PayPal API error:', {
                    status: err.response?.status,
                    data: err.response?.data,
                    message: err.message,
                });
            }
            else {
                console.error('Unexpected error:', err);
            }
            throw new common_1.InternalServerErrorException('Failed to create PayPal deposit');
        }
    }
    async capturePaymentAndCreateProject(orderId) {
        console.log('[DEBUG] ===> ĐÃ VÀO capturePaymentAndCreateProject', {
            orderId,
            time: new Date().toISOString(),
        });
        const accessToken = await this.getAccessToken();
        try {
            const captureRes = await axios_1.default.post(`${this.api}/v2/checkout/orders/${orderId}/capture`, {}, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (captureRes.status !== 201) {
                throw new Error('Payment capture failed with status: ' + captureRes.status);
            }
            console.log('🔄 Finding transaction for orderId:', orderId);
            const transaction = await this.transactionRepo.findOneOrFail({
                where: { paypalOrderId: orderId },
                relations: [
                    'user',
                    'request',
                    'request.registrants',
                    'request.category',
                    'request.files',
                ],
            });
            console.log('✅ Found original transaction:', {
                id: transaction.id,
                userId: transaction.user?.id,
                userEmail: transaction.user?.email,
                requestId: transaction.request?.id,
                amount: transaction.amount,
                status: transaction.status,
                registrantsCount: transaction.request?.registrants?.length || 0,
            });
            const { user: payerUser, request } = transaction;
            console.log('🔄 Finding translator from registrants:', {
                registrants: request.registrants?.map((r) => ({
                    id: r.id,
                    email: r.email,
                })),
                payerUserId: payerUser.id,
                payerUserEmail: payerUser.email,
            });
            const translator = request.registrants.find((registrant) => registrant.id !== payerUser.id);
            if (!translator) {
                console.error('❌ No translator found in registrants');
                throw new Error('No translator found in registrants');
            }
            console.log('✅ Found translator:', {
                id: translator.id,
                email: translator.email,
            });
            const otherUserIds = request.registrants
                .map((user) => Number(user.id))
                .filter((uid) => uid !== Number(translator.id));
            const queryRunner = this.projectService['dataSource'].createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
            try {
                const createResult = await this.projectService.createProjectFromRequest(request, translator.id);
                const newProject = await this.projectRepository.findOneOrFail({
                    where: { id: createResult.projectId },
                });
                request.assignee = translator;
                request.registrants = [];
                request.project = newProject;
                request.status = Entities_1.RequestStatus.Approved;
                transaction.status = Entities_1.TransactionStatus.On_Hold;
                // Get translator's wallet to access paypalEmail
                const translatorWallet = await this.walletManagerService.getOrCreateWallet(translator.id);
                console.log('🔄 Creating translator transaction:', {
                    userId: translator.id,
                    userEmail: translator.email,
                    amount: Math.abs(transaction.amount),
                    requestId: request.id,
                });
                const translatorTransaction = this.transactionRepo.create({
                    user: { id: translator.id },
                    request: { id: request.id },
                    amount: Math.abs(transaction.amount),
                    status: Entities_1.TransactionStatus.On_Hold,
                    paypalEmail: translatorWallet?.paypalEmail ?? null,
                });
                // Get payer's wallet to access paypalEmail
                const payerWallet = await this.walletManagerService.getOrCreateWallet(payerUser.id);
                console.log('🔄 Creating requester transaction:', {
                    userId: payerUser.id,
                    userEmail: payerUser.email,
                    amount: Math.abs(transaction.amount),
                    requestId: request.id,
                });
                const requesterTransaction = this.transactionRepo.create({
                    user: { id: payerUser.id },
                    request: { id: request.id },
                    amount: Math.abs(transaction.amount),
                    status: Entities_1.TransactionStatus.On_Hold,
                    paypalEmail: payerWallet?.paypalEmail ?? null,
                });
                console.log('✅ Created requester transaction:', {
                    id: requesterTransaction.id,
                    userId: requesterTransaction.user?.id,
                    userEmail: requesterTransaction.user?.email,
                    requestId: requesterTransaction.request?.id,
                    amount: requesterTransaction.amount,
                    status: requesterTransaction.status,
                    type: 'Deposit', // Thêm type để debug
                });
                // Log transaction của translator
                console.log('[DEBUG] TRANSLATOR TRANSACTION:', {
                    userId: translatorTransaction.user?.id,
                    userEmail: translatorTransaction.user?.email,
                    requestId: translatorTransaction.request?.id,
                    amount: translatorTransaction.amount,
                    status: translatorTransaction.status,
                });
                // Log transaction của requester
                console.log('[DEBUG] REQUESTER TRANSACTION:', {
                    userId: requesterTransaction.user?.id,
                    userEmail: requesterTransaction.user?.email,
                    requestId: requesterTransaction.request?.id,
                    amount: requesterTransaction.amount,
                    status: requesterTransaction.status,
                });
                // Generate manifest for each file associated with the request
                if (request.files && request.files.length > 0) {
                    console.log(`🔄 Generating manifests for ${request.files.length} files...`);
                    for (const file of request.files) {
                        try {
                            await this.manifestService.generateManifest(file);
                            console.log(`✅ Generated manifest for file: ${file.fileName}`);
                        }
                        catch (error) {
                            console.error(`❌ Failed to generate manifest for file ${file.fileName}:`, error);
                            // Continue with other files even if one fails
                        }
                    }
                }
                else {
                    console.log('ℹ️ No files found for request, skipping manifest generation');
                }
                console.log('🔄 Saving all transactions to database...');
                await queryRunner.manager.save([
                    request,
                    transaction,
                    translatorTransaction,
                    requesterTransaction,
                ]);
                console.log('✅ Successfully saved all transactions to database');
                console.log('✅ Created transactions in capturePaymentAndCreateProject:', {
                    originalTransaction: {
                        id: transaction.id,
                        userId: transaction.user?.id,
                        userEmail: transaction.user?.email,
                        amount: transaction.amount,
                        status: transaction.status,
                    },
                    translatorTransaction: {
                        id: translatorTransaction.id,
                        userId: translatorTransaction.user?.id,
                        userEmail: translatorTransaction.user?.email,
                        amount: translatorTransaction.amount,
                        status: translatorTransaction.status,
                    },
                    requesterTransaction: {
                        id: requesterTransaction.id,
                        userId: requesterTransaction.user?.id,
                        userEmail: requesterTransaction.user?.email,
                        amount: requesterTransaction.amount,
                        status: requesterTransaction.status,
                    },
                });
                if (otherUserIds.length > 0) {
                    await this.mailService.notifyAllOthersRequestTaken(Number(request.id), otherUserIds);
                }
                const adminWallet = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
                adminWallet.balance =
                    Number(adminWallet.balance) + Number(transaction.amount);
                await queryRunner.manager.save(adminWallet);
                await queryRunner.commitTransaction();
                return {
                    success: true,
                    projectId: newProject.id,
                    requestId: request.id,
                    amount: transaction.amount,
                    currency: 'USD',
                    payerEmail: transaction.user?.email,
                    receiver: request.assignee?.fullName || request.assignee?.email,
                    date: transaction.createdAt,
                    description: request.description,
                };
            }
            catch (err) {
                await queryRunner.rollbackTransaction();
                console.error('Project creation failed:', err);
                return {
                    success: false,
                    error: err?.message || 'Project creation failed',
                };
            }
            finally {
                await queryRunner.release();
            }
        }
        catch (err) {
            console.error('PayPal capture failed:', err);
            return {
                success: false,
                error: err?.message || 'PayPal capture failed',
            };
        }
    }
    async capturePayment(orderId) {
        const accessToken = await this.getAccessToken();
        try {
            const captureRes = await axios_1.default.post(`${this.api}/v2/checkout/orders/${orderId}/capture`, {}, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (captureRes.status !== 201) {
                throw new Error('Payment capture failed with status: ' + captureRes.status);
            }
            const transaction = await this.transactionRepo.findOneOrFail({
                where: { paypalOrderId: orderId },
                relations: [
                    'user',
                    'request',
                    'request.requester', // Đúng trường requester
                    'request.registrants',
                    'request.category',
                    'request.files',
                ],
            });
            const user = transaction.user;
            let request = transaction.request;
            if (request.isPublic && !request.category) {
                request = await this.requestRepository.findOneOrFail({
                    where: { id: request.id },
                    relations: ['category'],
                });
            }
            if (!request || !user) {
                throw new Error('Invalid request or user information.');
            }
            transaction.status = Entities_1.TransactionStatus.On_Hold;
            let translatorTransaction = null;
            if (request.assignee && request.assignee.id !== user.id) {
                const assigneeWallet = await this.walletManagerService.getOrCreateWallet(request.assignee.id);
                translatorTransaction = this.transactionRepo.create({
                    user: { id: request.assignee.id },
                    request: { id: request.id },
                    amount: transaction.amount,
                    status: Entities_1.TransactionStatus.On_Hold,
                    paypalEmail: assigneeWallet?.paypalEmail ?? null,
                });
            }
            await this.transactionRepo.save(transaction);
            if (translatorTransaction) {
                await this.transactionRepo.save(translatorTransaction);
            }
            const requesterWallet = await this.walletManagerService.getOrCreateWallet(request.requester.id);
            const requesterTransaction = this.transactionRepo.create({
                user: { id: request.requester.id },
                request: { id: request.id },
                amount: Math.abs(transaction.amount),
                status: Entities_1.TransactionStatus.Completed,
                paypalEmail: requesterWallet?.paypalEmail ?? null,
            });
            await this.transactionRepo.save(requesterTransaction);
            // Log để debug
            console.log('[DEBUG] REQUESTER TRANSACTION (capturePayment):', {
                id: requesterTransaction.id,
                userId: requesterTransaction.user?.id,
                userEmail: requesterTransaction.user?.email,
                requestId: requesterTransaction.request?.id,
                amount: requesterTransaction.amount,
                status: requesterTransaction.status,
            });
            let projectId = null;
            let receiver = null;
            // Nếu là public request, cập nhật trạng thái sang Approved và tạo project mới
            if (request.isPublic && request.status !== Entities_1.RequestStatus.Approved) {
                if (!request.category?.id) {
                    console.error('[PayPal] Request public thiếu category khi tạo project:', request);
                    return {
                        success: false,
                        error: 'Request public không có category, không thể tạo project',
                        requestId: request.id,
                        amount: transaction.amount,
                        payerEmail: user.email,
                        date: transaction.createdAt,
                        description: request.description,
                    };
                }
                request.status = Entities_1.RequestStatus.Approved;
                // Tạo project mới từ request public
                if (!request.project) {
                    try {
                        // Gán assignee là user vừa thanh toán
                        request.assignee = user;
                        // Gọi service tạo project từ request
                        const createResult = await this.projectService.createProjectFromRequest(request, user.id);
                        const newProject = await this.projectRepository.findOneOrFail({
                            where: { id: createResult.projectId },
                        });
                        request.project = newProject;
                        projectId = newProject.id;
                        receiver = request.assignee?.fullName || request.assignee?.email;
                    }
                    catch (err) {
                        console.error('[PayPal] Error creating project from public request:', err);
                        return {
                            success: false,
                            error: 'Payment succeeded but failed to create project: ' + err,
                            requestId: request.id,
                            amount: transaction.amount,
                            payerEmail: user.email,
                            date: transaction.createdAt,
                            description: request.description,
                        };
                    }
                }
                else {
                    projectId = request.project.id;
                    receiver = request.assignee?.fullName || request.assignee?.email;
                }
                await this.requestRepository.save(request);
            }
            const adminWallet = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
            adminWallet.balance =
                Number(adminWallet.balance) + Number(transaction.amount);
            await this.walletRepository.save(adminWallet);
            // Cộng tiền vào balance của user
            const userWallet = await this.walletManagerService.getOrCreateWallet(user.id);
            userWallet.balance =
                Number(userWallet.balance) + Number(transaction.amount);
            await this.walletManagerService['walletRepository'].save(userWallet);
            logger_1.logger.log(`[PayPal] Payment captured for order ${orderId}, request ID ${request.id}, user ID ${user.id}, projectId: ${projectId}`);
            return {
                success: true,
                requestId: request.id,
                projectId,
                amount: transaction.amount,
                currency: 'USD',
                payerEmail: user.email,
                receiver,
                date: transaction.createdAt,
                description: request.description,
            };
        }
        catch (err) {
            console.error('[PayPal] capturePayment failed:', err);
            return {
                success: false,
                error: err?.message || 'PayPal capture failed',
            };
        }
    }
    async withdraw(userId, dto) {
        const { amount, paypalEmail, requestId, paypalOrderId } = dto;
        if (amount <= 0) {
            throw new common_1.BadRequestException('Amount must be positive');
        }
        if (!paypalEmail || !paypalEmail.includes('@')) {
            throw new common_1.BadRequestException('Invalid PayPal email address');
        }
        const userEntity = await this.userRepository.findOneOrFail({
            where: { id: userId },
        });
        let request = undefined;
        if (requestId) {
            request = await this.requestRepository.findOneOrFail({
                where: { id: requestId },
            });
        }
        // Debug: log giá trị paypalEmail khi tạo transaction
        console.log('Withdraw - paypalEmail:', paypalEmail, 'DTO:', dto);
        const transactionPayload = {
            user: userEntity,
            amount: -Math.abs(amount),
            status: Entities_1.TransactionStatus.Pending,
            paypalOrderId: paypalOrderId ?? undefined,
            request,
            paypalEmail,
        };
        const transaction = this.transactionRepo.create(transactionPayload);
        await this.transactionRepo.save(transaction);
        // Debug: log transaction sau khi lưu
        console.log('Saved transaction:', transaction);
        // Create notification for admin about new withdrawal request
        await this.notificationService.createNotification({
            userId: this.ADMIN_USER_ID,
            type: 'WITHDRAWAL_REQUESTED',
            message: `New withdrawal request from ${userEntity.username || userEntity.email} for $${amount}`,
            createdBy: userId,
        });
        return transaction;
    }
    async approveWithdrawal(transactionId) {
        const transaction = await this.transactionRepo.findOneOrFail({
            where: { id: transactionId },
            relations: ['user', 'request', 'request.assignee'],
        });
        if (transaction.status !== Entities_1.TransactionStatus.Pending) {
            throw new common_1.BadRequestException('Transaction is not pending approval.');
        }
        // Get user's wallet to access paypalEmail
        const userWallet = await this.walletManagerService.getOrCreateWallet(transaction.user.id);
        const paypalEmail = userWallet.paypalEmail || transaction.user.email;
        const amount = Math.abs(Number(transaction.amount));
        // Luôn lấy access token mới cho payout
        const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
        const tokenRes = await axios_1.default.post(`${process.env.PAYPAL_API}/v1/oauth2/token`, 'grant_type=client_credentials', {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        const accessToken = tokenRes.data.access_token;
        console.log('[PayPal] Access token:', accessToken.slice(0, 12) + '...');
        console.log('[PayPal] Payout endpoint:', `${process.env.PAYPAL_API}/v1/payments/payouts`);
        console.log('[PayPal] Payout to email:', paypalEmail);
        const payoutData = {
            sender_batch_header: {
                sender_batch_id: `admin_payout_${Date.now()}`,
                email_subject: 'Your withdrawal has been approved!',
                email_message: 'You have received your payout via PayPal.',
            },
            items: [
                {
                    recipient_type: 'EMAIL',
                    amount: {
                        value: amount.toFixed(2),
                        currency: 'USD',
                    },
                    note: 'Withdrawal approved .',
                    receiver: paypalEmail,
                    sender_item_id: `txn_${transactionId}_${Date.now()}`,
                },
            ],
        };
        try {
            const res = await axios_1.default.post(`${process.env.PAYPAL_API}/v1/payments/payouts`, payoutData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (res.status !== 201) {
                throw new Error('PayPal payout failed with status: ' + res.status);
            }
            transaction.status = Entities_1.TransactionStatus.Completed;
            await this.transactionRepo.save(transaction);
            const adminWallet = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
            adminWallet.balance =
                Number(adminWallet.balance) + Number(transaction.amount);
            await this.walletRepository.save(adminWallet);
            logger_1.logger.log(`PayPal payout approved for transaction ID ${transactionId}, amount: ${amount}`);
            // Create notification for user about approved withdrawal
            await this.notificationService.createNotification({
                userId: transaction.user.id,
                type: 'WITHDRAWAL_APPROVED',
                message: `Your withdrawal request for $${amount} has been approved and processed via PayPal.`,
                createdBy: this.ADMIN_USER_ID,
            });
            return transaction;
        }
        catch (err) {
            console.error('PayPal payout failed:', err);
            throw new common_1.InternalServerErrorException('Failed to approve PayPal withdrawal');
        }
    }
    async getAllPendingWithdrawals() {
        const txns = await this.transactionRepo
            .createQueryBuilder('t')
            .leftJoinAndSelect('t.user', 'user')
            .where('t.amount < 0')
            .andWhere('t.status = :status', { status: Entities_1.TransactionStatus.Pending })
            .orderBy('t.createdAt', 'DESC')
            .getMany();
        return txns.map((txn) => ({
            ...txn,
            createdAt: txn.createdAt instanceof Date
                ? txn.createdAt.toISOString()
                : txn.createdAt,
        }));
    }
    async finalizeTranslation(requestId) {
        const request = await this.requestRepository.findOneOrFail({
            where: { id: requestId },
            relations: ['assignee', 'requester'],
        });
        if (!request.assignee || !request.requester) {
            throw new common_1.BadRequestException('Request must have both requester and assignee.');
        }
        await this.approveTranslation(requestId, request.requester.id);
        await this.approveTranslation(requestId, request.assignee.id);
        const [requesterApproval, assigneeApproval] = await Promise.all([
            this.translationApprovalRepository.findOne({
                where: {
                    request: { id: requestId },
                    user: { id: request.requester.id },
                },
            }),
            this.translationApprovalRepository.findOne({
                where: {
                    request: { id: requestId },
                    user: { id: request.assignee.id },
                },
            }),
        ]);
        if (!requesterApproval?.isApproved || !assigneeApproval?.isApproved) {
            throw new common_1.BadRequestException('Both parties must approve before finalizing.');
        }
        const transaction = await this.transactionRepo.findOneOrFail({
            where: { request: { id: requestId } },
            relations: ['request', 'user'],
        });
        if (transaction.status !== Entities_1.TransactionStatus.Pending &&
            transaction.status !== Entities_1.TransactionStatus.Approved) {
            throw new common_1.BadRequestException('Transaction already finalized or in invalid state.');
        }
        transaction.status = Entities_1.TransactionStatus.Approved;
        await this.transactionRepo.save(transaction);
        const feePercentage = await this.feeService.getDefaultFee();
        const feeAmount = Number(transaction.amount) * (feePercentage / 100);
        const payoutAmount = Number(transaction.amount) - feeAmount;
        await this.walletManagerService.addToBalance(request.assignee.id, payoutAmount);
        const adminWallet = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
        adminWallet.balance += feeAmount;
        await this.walletRepository.save(adminWallet);
        await this.transactionRepo.save({
            user: await this.userRepository.findOneByOrFail({
                id: this.ADMIN_USER_ID,
            }),
            request,
            amount: feeAmount,
            status: Entities_1.TransactionStatus.Completed,
        });
        request.status = Entities_1.RequestStatus.Completed;
        await this.requestRepository.save(request);
        return true;
    }
    async approveTranslation(requestId, userId) {
        const request = await this.requestRepository.findOneOrFail({
            where: { id: requestId },
            relations: ['assignee', 'requester'],
        });
        if (!request.assignee || !request.requester) {
            throw new common_1.BadRequestException('Request must have both requester and assignee.');
        }
        if (userId !== request.assignee.id && userId !== request.requester.id) {
            throw new common_1.BadRequestException('Only requester or assignee can approve the translation.');
        }
        // Check if approval already exists
        let approval = await this.translationApprovalRepository.findOne({
            where: {
                request: { id: requestId },
                user: { id: userId },
            },
        });
        if (!approval) {
            approval = this.translationApprovalRepository.create({
                request: { id: requestId },
                user: { id: userId },
                isApproved: true,
            });
        }
        else {
            approval.isApproved = true;
        }
        await this.translationApprovalRepository.save(approval);
        return true;
    }
    async payFinal50Percent(requestId) {
        const request = await this.requestRepository.findOneOrFail({
            where: { id: requestId },
            relations: ['requester'],
        });
        const approvals = await this.translationApprovalRepository.find({
            where: { request: { id: requestId } },
        });
        const bothApproved = approvals.find((a) => a.user.id === request.requester.id && a.isApproved) &&
            approvals.find((a) => a.user.id === request.assignee.id && a.isApproved);
        if (!bothApproved) {
            throw new common_1.BadRequestException('Translation not yet approved by both parties.');
        }
        const originalTx = await this.transactionRepo.findOneOrFail({
            where: { request: { id: requestId } },
            relations: ['user'],
        });
        const remainingAmount = originalTx.amount; // remaining 50%
        const wallet = await this.walletManagerService.getOrCreateWallet(request.requester.id);
        if (wallet.balance < remainingAmount) {
            throw new common_1.BadRequestException('Not enough balance to pay final 50%.');
        }
        wallet.balance -= remainingAmount;
        await this.walletRepository.save(wallet);
        const tx = this.transactionRepo.create({
            user: { id: request.requester.id },
            request: { id: request.id },
            amount: remainingAmount,
            status: Entities_1.TransactionStatus.Completed,
        });
        await this.transactionRepo.save(tx);
    }
    async rejectWithdrawal(transactionId) {
        return `transactionId : ${transactionId}`;
    }
};
exports.PaypalService = PaypalService;
exports.PaypalService = PaypalService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_1.InjectRepository)(Entities_1.TransactionEntity)),
    tslib_1.__param(1, (0, typeorm_1.InjectRepository)(Entities_1.ProjectEntity)),
    tslib_1.__param(2, (0, typeorm_1.InjectRepository)(Entities_1.RequestEntity)),
    tslib_1.__param(3, (0, typeorm_1.InjectRepository)(Entities_2.TranslationApprovalEntity)),
    tslib_1.__param(4, (0, typeorm_1.InjectRepository)(Entities_1.WalletEntity)),
    tslib_1.__param(5, (0, typeorm_1.InjectRepository)(Entities_1.UserEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _d : Object, typeof (_e = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _e : Object, typeof (_f = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _f : Object, typeof (_g = typeof project_manager_service_1.ProjectManagerService !== "undefined" && project_manager_service_1.ProjectManagerService) === "function" ? _g : Object, typeof (_h = typeof mailer_service_1.MailService !== "undefined" && mailer_service_1.MailService) === "function" ? _h : Object, typeof (_j = typeof wallet_manager_service_1.WalletManagerService !== "undefined" && wallet_manager_service_1.WalletManagerService) === "function" ? _j : Object, typeof (_k = typeof manifest_service_1.ManifestService !== "undefined" && manifest_service_1.ManifestService) === "function" ? _k : Object, typeof (_l = typeof fee_manager_service_1.FeeService !== "undefined" && fee_manager_service_1.FeeService) === "function" ? _l : Object, typeof (_m = typeof notification_manager_service_1.NotificationManagerService !== "undefined" && notification_manager_service_1.NotificationManagerService) === "function" ? _m : Object])
], PaypalService);


/***/ }),
/* 89 */
/***/ ((module) => {

module.exports = require("axios");

/***/ }),
/* 90 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var ProjectManagerService_1;
var _a, _b, _c, _d, _e, _f, _g, _h, _j;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectManagerService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(15);
const Entities_1 = __webpack_require__(16);
const common_2 = __webpack_require__(21);
const common_http_service_impl_1 = __webpack_require__(91);
const github_manager_service_1 = __webpack_require__(92);
const notification_manager_service_1 = __webpack_require__(94);
let ProjectManagerService = ProjectManagerService_1 = class ProjectManagerService extends common_http_service_impl_1.CommonHttpServiceImpl {
    constructor(categoryRepository, projectRepository, userRepository, projectRoleRepository, branchRepository, commitRepository, dataSource, githubService, notificationService) {
        super();
        this.categoryRepository = categoryRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.projectRoleRepository = projectRoleRepository;
        this.branchRepository = branchRepository;
        this.commitRepository = commitRepository;
        this.dataSource = dataSource;
        this.githubService = githubService;
        this.notificationService = notificationService;
        this.logger = new common_1.Logger(ProjectManagerService_1.name);
    }
    /** Ensures the user exists and has the required permission for the project.
     * @param projectId  - Project ID
     * @param uid        - User ID
     * @param against - Permission to check
     * @returns {Permission} - `Permission` instance corresponding to the user's permissions.
     * @throws {NotFoundException} - If the project or user does not exist.
     * @throws {ForbiddenException} - If the user does not have the required permission.
     */
    async testPermissions(projectId, uid, against) {
        const permissionValue = normalizePermission(against);
        this.logger.debug(`Checking if user [${uid}] has permission [${permissionValue}] for project [${projectId}]`);
        const projectExists = await this.projectRepository.exists({
            where: { id: BigInt(projectId) },
        });
        if (!projectExists) {
            this.logger.debug(`Project [${projectId}] does not exist`);
            throw new common_1.NotFoundException(`Unknown project`);
        }
        const userExists = await this.userRepository.exists({
            where: { id: BigInt(uid) },
        });
        if (!userExists) {
            this.logger.debug(`User [${uid}] does not exist`);
            throw new common_1.NotFoundException(`Unknown user`);
        }
        const userPermissionFlags = await this.projectRoleRepository
            .createQueryBuilder('role')
            .innerJoin('role.users', 'user')
            .where('role.project = :projectId', { projectId })
            .andWhere('user.id = :userId', { userId: uid })
            .select([`BIT_OR(role.permissionFlags) as userPermissionFlags`])
            .getRawOne()
            .then((result) => new common_2.Permission(result?.userPermissionFlags ?? common_2.PermissionFlags.None));
        // So sánh bitmask trực tiếp
        if ((userPermissionFlags.value & permissionValue) !== permissionValue) {
            this.logger.debug(`User [${uid}] does NOT have permission [${permissionValue}] for project [${projectId}]`);
            throw new common_1.ForbiddenException('You do not have permission to perform this action');
        }
        return new common_2.Permission(userPermissionFlags);
    }
    async createProject(uid, data) {
        const { name, description, isPrivate, tags = [], categoryId, targetLanguages } = data;
        this.logger.debug('Received project data:', data);
        const userExists = await this.userRepository.exists({
            where: { id: BigInt(uid) },
        });
        if (!userExists)
            throw new common_1.BadRequestException('Unknown user');
        const categoryExists = await this.categoryRepository.exists({
            where: { id: BigInt(categoryId) },
        });
        if (!categoryExists)
            throw new common_1.BadRequestException('Unknown category');
        const queryRunner = this.dataSource.createQueryRunner();
        if (!queryRunner)
            throw new common_1.InternalServerErrorException('Database connection error');
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Handle tags
            const projectTags = [];
            for (const tag of tags) {
                const existingTag = await queryRunner.manager.findOne(Entities_1.ProjectTagEntity, { where: { name: tag } });
                if (existingTag) {
                    projectTags.push({ id: existingTag.id });
                }
                else {
                    const newTag = queryRunner.manager.create(Entities_1.ProjectTagEntity, {
                        name: tag,
                    });
                    const savedTag = await queryRunner.manager.save(newTag);
                    projectTags.push({ id: savedTag.id });
                }
            }
            // Create project without defaultBranch yet
            const project = this.projectRepository.create({
                name,
                description,
                createdBy: { id: uid },
                isPrivate,
                tags: projectTags,
                targetLanguages,
                createdAt: new Date(),
                category: { id: BigInt(categoryId) },
            });
            const savedProject = await queryRunner.manager.save(project);
            // Create 'main' branch in DB
            const mainBranch = queryRunner.manager.create(Entities_1.BranchEntity, {
                name: 'main',
                project: savedProject,
                user: { id: uid },
                createdAt: new Date(),
            });
            const savedBranch = await queryRunner.manager.save(mainBranch);
            // Create initial commit
            const initialCommit = queryRunner.manager.create(Entities_1.CommitEntity, {
                branch: savedBranch,
                project: savedProject,
                author: { id: uid },
                message: 'Initial commit',
                contentSnapshot: '{}',
                createdAt: new Date(),
            });
            await queryRunner.manager.save(initialCommit);
            // Update defaultBranch reference in project
            savedProject.defaultBranch = savedBranch;
            await queryRunner.manager.save(savedProject);
            // Create roles
            const ownerRole = queryRunner.manager.create(Entities_1.ProjectRoleEntity, {
                project: savedProject,
                permissionFlags: new common_2.Permission(common_2.PermissionFlags.Owner),
                name: 'Project Owner',
            });
            const everyoneRole = queryRunner.manager.create(Entities_1.ProjectRoleEntity, {
                project: savedProject,
                permissionFlags: new common_2.Permission(
                // Everyone role should only have ViewProject permission
                BigInt(common_2.PermissionFlags.ViewProject)),
                name: 'Everyone',
            });
            const savedOwnerRole = await queryRunner.manager.save(ownerRole);
            const savedEveryoneRole = await queryRunner.manager.save(everyoneRole);
            // Add owner to owner role
            savedOwnerRole.users = [{ id: uid }];
            await queryRunner.manager.save(savedOwnerRole);
            // Add owner to Everyone role
            savedEveryoneRole.users = [{ id: uid }];
            await queryRunner.manager.save(savedEveryoneRole);
            // Add owner to project members
            savedProject.members = [{ id: uid }];
            await queryRunner.manager.save(savedProject);
            const githubRepoName = `project-${savedProject.id}`;
            // Create GitHub repo without auto init
            await this.githubService.createRepository(githubRepoName, isPrivate);
            // Push README to 'main' branch (create it in GitHub)
            await this.githubService.pushInitialFile({
                repo: githubRepoName,
                path: 'README.md',
                message: 'Initial commit',
                content: `# ${name}\n\n${description || ''}`,
                branch: 'main', // ✅ must match DB
            });
            await queryRunner.commitTransaction();
            this.logger.debug(`Project created successfully with ID: ${savedProject.id}`);
            return {
                message: 'Project created successfully',
                projectId: savedProject.id,
                branchId: savedBranch.id,
            };
        }
        catch (error) {
            this.logger.debug('Rolling back transaction');
            await queryRunner.rollbackTransaction();
            if (error instanceof common_1.BadRequestException)
                throw error;
            this.unknownErrorHanlder(error, 'Failed to create project');
        }
        finally {
            await queryRunner.release();
        }
    }
    async createProjectFromRequest(request, uid) {
        const tags = request.tags?.map((tag) => tag.name) ?? [];
        const createProjectDto = {
            name: request.title, // Chỉ lưu tên gốc, không prefix
            description: request.description,
            isPrivate: true,
            tags,
            targetLanguages: request.targetLanguages || [],
        };
        if (request.category?.id) {
            createProjectDto.categoryId = request.category.id.toString();
        }
        return this.createProject(uid, createProjectDto);
    }
    async getProjectsCount() {
        return await this.projectRepository.count();
    }
    async fetchAllUserProjects(userId) {
        const qb = this.projectRepository
            .createQueryBuilder('project')
            .leftJoin('project.createdBy', 'createdBy')
            .leftJoin('project.members', 'member')
            .leftJoin('project.tags', 'tags')
            .leftJoin('project.category', 'category')
            .where('createdBy.id = :userId', { userId })
            .orWhere('member.id = :userId', { userId })
            .select([
            'project.id',
            'project.name',
            'project.description',
            'project.isPrivate',
            'project.targetLanguages',
            'project.createdAt',
            'createdBy.id',
            'createdBy.username',
            'createdBy.fullName',
            'category.id',
            'category.name',
            'member.id',
            'member.fullName',
            'tags.id',
            'tags.name',
        ]);
        return await qb.getMany();
    }
    async fetchProject(uid, projectId) {
        this.logger.debug(`Fetching project with ID: ${projectId}`);
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            select: ['isPrivate'],
        });
        if (!project) {
            this.logger.debug(`Project [${projectId}] does not exist`);
            throw new common_1.NotFoundException(`Unknown project`);
        }
        const userCanViewProject = typeof uid !== 'undefined' &&
            (await this.testPermissions(projectId, uid, common_2.PermissionFlags.ViewProject).catch(() => false));
        if (project.isPrivate && !userCanViewProject) {
            this.logger.debug(`User with ID ${uid} does not have access to project with ID ${projectId}`);
            throw new common_1.ForbiddenException(`You do not have access to this project`);
        }
        const queryBuilder = this.projectRepository.createQueryBuilder('project');
        const projectMetadataQuery = queryBuilder
            .select([
            'project.id',
            'project.name',
            'project.description',
            'project.isPrivate',
            'project.targetLanguages',
            'project.createdAt',
            'createdBy.id',
            'createdBy.username',
            'createdBy.fullName',
            'tags',
            'category.id',
            'category.name',
            'category.description',
        ])
            .where('project.id = :projectId', { projectId })
            .leftJoin('project.createdBy', 'createdBy')
            .leftJoin('project.tags', 'tags')
            .leftJoin('project.category', 'category');
        if (!userCanViewProject) {
            this.logger.debug(`Project with ID ${projectId} is public, allowing metadata access`);
            return projectMetadataQuery.getOne();
        }
        this.logger.debug(`User with ID ${uid} has access to project with ID ${projectId}, fetching full project data`);
        try {
            return await projectMetadataQuery
                .leftJoinAndSelect('project.projectRoles', 'projectRoles')
                .andWhere('projectRoles.name != :systemRole', {
                systemRole: 'Everyone',
            })
                .getOne();
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to fetch project metadata');
        }
    }
    async updateProjectMetadata(uid, projectId, updateData) {
        this.logger.debug(`Updating project with ID: ${projectId}`, updateData);
        await this.testPermissions(projectId, uid, common_2.PermissionFlags.ManageProjectMetadata);
        const queryRunner = this.dataSource.createQueryRunner();
        if (!queryRunner) {
            this.logger.error('Database connection error');
            throw new common_1.InternalServerErrorException('Database connection error');
        }
        this.logger.debug('Starting transaction for project update');
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const project = await queryRunner.manager.findOne(Entities_1.ProjectEntity, {
                where: { id: projectId },
                relations: ['tags'],
            });
            if (!project) {
                this.logger.debug(`Project with ID ${projectId} not found`);
                throw new common_1.BadRequestException(`Unknown project`);
            }
            const newTags = new Map(project.tags.map((tag) => [tag.id, tag.name]));
            for (const toAdd of updateData.addTags ?? []) {
                const existingTag = await queryRunner.manager.findOne(Entities_1.ProjectTagEntity, { where: { name: toAdd }, select: ['id', 'name'] });
                if (existingTag) {
                    newTags.set(existingTag.id, existingTag.name);
                }
                else {
                    const newTag = queryRunner.manager.create(Entities_1.ProjectTagEntity, {
                        name: toAdd,
                    });
                    const savedTag = await queryRunner.manager.save(newTag);
                    newTags.set(savedTag.id, savedTag.name);
                }
            }
            for (const toRemove of updateData.removeTags ?? []) {
                const existingTag = await queryRunner.manager.findOne(Entities_1.ProjectTagEntity, { where: { name: toRemove }, select: ['id'] });
                if (existingTag) {
                    newTags.delete(existingTag.id);
                }
            }
            delete updateData.addTags;
            delete updateData.removeTags;
            let category = undefined;
            if (updateData.categoryId !== undefined) {
                category = await queryRunner.manager.findOne(Entities_1.CategoryEntity, {
                    where: { id: BigInt(updateData.categoryId) },
                });
                if (!category) {
                    throw new common_1.BadRequestException(`Category with ID ${updateData.categoryId} not found`);
                }
            }
            delete updateData.categoryId;
            Object.assign(project, {
                ...updateData,
                category: category ?? project.category,
                tags: Array.from(newTags.entries()).map(([id, name]) => ({ id, name })),
            });
            const updatedProject = await queryRunner.manager.save(project);
            await queryRunner.commitTransaction();
            this.logger.debug(`Project updated successfully with ID: ${updatedProject.id}`);
            // Get project members to notify them about the update
            const projectMembers = await this.projectRoleRepository
                .createQueryBuilder('role')
                .innerJoin('role.users', 'user')
                .where('role.project = :projectId', { projectId })
                .select(['user.id'])
                .getMany();
            const memberIds = projectMembers.flatMap(role => role.users?.map(user => user.id).filter(id => id !== uid) || []);
            // Notify all project members about the update
            for (const memberId of memberIds) {
                await this.notificationService.createNotification({
                    userId: memberId,
                    type: 'PROJECT_UPDATED',
                    message: `Project "${updatedProject.name}" has been updated by a team member.`,
                    createdBy: uid,
                });
            }
            return updatedProject;
        }
        catch (error) {
            this.logger.debug('Rolling back transaction');
            await queryRunner.rollbackTransaction();
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.unknownErrorHanlder(error, 'Failed to update project metadata');
        }
        finally {
            this.logger.debug('Project update transaction released');
            await queryRunner.release();
        }
    }
    async deleteProject(projectId, userId) {
        this.logger.debug(`Deleting project with ID: ${projectId}`);
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['defaultBranch', 'createdBy'],
        });
        if (!project) {
            this.logger.debug(`Project [${projectId}] does not exist`);
            throw new common_1.NotFoundException(`Unknown project`);
        }
        // Chỉ cho phép owner xóa project
        if (!project.createdBy || String(project.createdBy.id) !== String(userId)) {
            this.logger.debug(`User [${userId}] không phải owner, không được xóa project [${projectId}]`);
            throw new common_1.ForbiddenException('Only project owner can delete the project');
        }
        const repoName = `project-${projectId}`;
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            await this.githubService.deleteRepository(repoName);
            await queryRunner.manager.remove(project);
            await queryRunner.commitTransaction();
            this.logger.debug(`Project [${projectId}] and repo deleted successfully`);
            return { message: `Project deleted successfully` };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Failed to delete project:', error);
            throw new common_1.InternalServerErrorException('Failed to delete project');
        }
        finally {
            await queryRunner.release();
        }
    }
    async findUserToProject(projectId, identifier, uid) {
        await this.testPermissions(projectId, uid, common_2.PermissionFlags.ManageMembers);
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['members'],
        });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        const existingMemberIds = project.members.map((m) => m.id);
        const users = await this.userRepository
            .createQueryBuilder('user')
            .select(['user.id', 'user.fullName', 'user.email', 'user.phone'])
            .where(`(user.email = :identifier OR user.fullName LIKE :likeIdentifier)`, { identifier, likeIdentifier: `%${identifier}%` })
            .andWhere(existingMemberIds.length
            ? 'user.id NOT IN (:...existingMemberIds)'
            : '1=1', {
            existingMemberIds,
        })
            .andWhere(`user.roleId NOT IN (:...excludedRoles)`, {
            excludedRoles: [2, 1],
        })
            .limit(10)
            .getRawMany();
        return users;
    }
    async addUserToProject(projectId, userId, uid) {
        await this.testPermissions(projectId, uid, common_2.PermissionFlags.ManageMembers);
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['members'],
        });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        const isAlreadyMember = project.members.some((m) => m.id === userId);
        if (isAlreadyMember) {
            throw new common_1.BadRequestException('User is already a member of the project');
        }
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        // Start transaction
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Add user to project members
            project.members.push(user);
            await queryRunner.manager.save(project);
            // Add user to Everyone role
            const everyoneRole = await queryRunner.manager.findOne(Entities_1.ProjectRoleEntity, {
                where: {
                    project: { id: projectId },
                    name: 'Everyone',
                },
                relations: ['users'],
            });
            if (!everyoneRole) {
                // If Everyone role doesn't exist, create it
                const newEveryoneRole = queryRunner.manager.create(Entities_1.ProjectRoleEntity, {
                    project: { id: projectId },
                    permissionFlags: new common_2.Permission(
                    // Everyone role should only have ViewProject permission
                    BigInt(common_2.PermissionFlags.ViewProject)),
                    name: 'Everyone',
                    users: [user],
                });
                await queryRunner.manager.save(newEveryoneRole);
                // LOG: Tạo role Everyone mới
                console.log(`[addUserToProject] Created new role 'Everyone' for project ${projectId} with permissionFlags:`, newEveryoneRole.permissionFlags.value.toString(), newEveryoneRole.permissionFlags.resolveNames());
            }
            else {
                // Add user to existing Everyone role
                const existingUserIds = new Set(everyoneRole.users.map((u) => u.id.toString()));
                if (!existingUserIds.has(user.id.toString())) {
                    everyoneRole.users.push(user);
                    await queryRunner.manager.save(everyoneRole);
                }
                // LOG: Đã thêm user vào role Everyone
                console.log(`[addUserToProject] Added user ${userId} to existing role 'Everyone' for project ${projectId} with permissionFlags:`, everyoneRole.permissionFlags.value.toString(), everyoneRole.permissionFlags.resolveNames());
            }
            await queryRunner.commitTransaction();
            return project;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async isUserProjectMember(projectId, userId) {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['members'],
        });
        if (!project)
            return false;
        return project.members.some(member => member.id === userId);
    }
    async removeUserFromProject(projectId, userId) {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['members', 'createdBy'],
        });
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        // Không cho phép remove owner
        if (project.createdBy && String(project.createdBy.id) === String(userId)) {
            throw new common_1.ForbiddenException('Cannot remove project owner');
        }
        // Xóa trực tiếp bằng raw SQL
        await this.dataSource.query('DELETE FROM project_members_user WHERE projectId = ? AND userId = ?', [projectId, userId]);
        return { message: 'User removed from project members' };
    }
    async getProjectMembers(projectId) {
        const roles = await this.projectRoleRepository.find({
            where: { project: { id: projectId } },
            relations: ['users'],
        });
        const memberMap = {};
        for (const role of roles) {
            for (const user of role.users) {
                const key = user.id.toString();
                if (!memberMap[key]) {
                    memberMap[key] = {
                        id: key,
                        username: user.username,
                        fullName: user.fullName,
                        email: user.email,
                        roles: [],
                    };
                }
                memberMap[key].roles.push({
                    id: role.id.toString(),
                    name: role.name,
                    permissionFlags: role.permissionFlags.value.toString(), // Ensure proper serialization
                });
            }
        }
        return Object.values(memberMap);
    }
    async getProjectMembersWithRoles(projectId) {
        // Get project with members first
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['members', 'createdBy'],
        });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        // Get accepted invitations to determine join times
        const acceptedInvitations = await this.dataSource
            .getRepository(Entities_1.ProjectInvitationEntity)
            .createQueryBuilder('invitation')
            .where('invitation.projectId = :projectId', { projectId })
            .andWhere('invitation.status = :status', { status: Entities_1.InvitationStatus.ACCEPTED })
            .select(['invitation.invitedUserId', 'invitation.updatedAt'])
            .getMany();
        // Create a map of user join times from invitations
        const userJoinTimes = new Map();
        console.log('🔍 Accepted invitations for project', projectId, ':', acceptedInvitations);
        for (const invitation of acceptedInvitations) {
            const userId = invitation.invitedUserId.toString();
            const joinTime = invitation.updatedAt;
            userJoinTimes.set(userId, joinTime);
            console.log('🔍 Setting join time for user', userId, ':', joinTime);
        }
        console.log('🔍 Final userJoinTimes map:', Object.fromEntries(userJoinTimes));
        // Get all roles except Everyone role first
        const roles = await this.projectRoleRepository.find({
            where: {
                project: { id: projectId },
                name: (0, typeorm_2.Not)('Everyone'),
            },
            relations: ['users'],
        });
        // Get Everyone role separately
        const everyoneRole = await this.projectRoleRepository.findOne({
            where: {
                project: { id: projectId },
                name: 'Everyone',
            },
            relations: ['users'],
        });
        // If Everyone role doesn't exist or has wrong permissions, fix it
        if (!everyoneRole) {
            this.logger.warn(`Everyone role not found for project ${projectId}, creating it`);
            const newEveryoneRole = this.projectRoleRepository.create({
                project: { id: projectId },
                permissionFlags: new common_2.Permission(BigInt(common_2.PermissionFlags.ViewProject)),
                name: 'Everyone',
                users: project.members, // Add all project members to Everyone role
            });
            await this.projectRoleRepository.save(newEveryoneRole);
        }
        else if (everyoneRole.permissionFlags.value !== BigInt(common_2.PermissionFlags.ViewProject)) {
            this.logger.warn(`Fixing Everyone role permissions for project ${projectId}`);
            everyoneRole.permissionFlags = new common_2.Permission(BigInt(common_2.PermissionFlags.ViewProject));
            // Add any missing members to Everyone role
            const everyoneUserIds = new Set(everyoneRole.users.map((u) => u.id.toString()));
            const missingUsers = project.members.filter((m) => !everyoneUserIds.has(m.id.toString()));
            if (missingUsers.length > 0) {
                everyoneRole.users = [...everyoneRole.users, ...missingUsers];
            }
            await this.projectRoleRepository.save(everyoneRole);
        }
        const memberMap = {};
        // First add all project members
        for (const member of project.members) {
            memberMap[member.id.toString()] = {
                id: member.id.toString(),
                username: member.username,
                fullName: member.fullName,
                email: member.email,
                roles: [],
                // For project owner, use project creation date as joinedAt
                joinedAt: project.createdBy && member.id === project.createdBy.id ? project.createdAt.toISOString() : undefined,
            };
        }
        // Update joinedAt for non-owner members using invitation times
        for (const member of project.members) {
            if (project.createdBy && member.id !== project.createdBy.id) {
                const joinTime = userJoinTimes.get(member.id.toString());
                if (joinTime) {
                    memberMap[member.id.toString()].joinedAt = joinTime.toISOString();
                }
            }
        }
        // Then add roles to members
        for (const role of roles) {
            for (const user of role.users) {
                const key = user.id.toString();
                if (!memberMap[key]) {
                    // If user is in a role but not in project members, add them
                    memberMap[key] = {
                        id: key,
                        username: user.username,
                        fullName: user.fullName,
                        email: user.email,
                        roles: [],
                    };
                }
                memberMap[key].roles.push({
                    id: role.id.toString(),
                    name: role.name,
                    permissionFlags: role.permissionFlags.value.toString(), // Ensure proper serialization
                });
                // Use invitation accept time if available, otherwise use role creation time
                const joinTime = userJoinTimes.get(key);
                console.log('🔍 Looking up join time for user', key, ':', joinTime);
                if (joinTime && !memberMap[key].joinedAt) {
                    memberMap[key].joinedAt = joinTime.toISOString();
                    console.log('🔍 Set joinedAt for user', key, 'to:', joinTime.toISOString());
                }
                else if (role.createdAt && (!memberMap[key].joinedAt || role.createdAt < new Date(memberMap[key].joinedAt))) {
                    memberMap[key].joinedAt = role.createdAt.toISOString();
                    console.log('🔍 Set joinedAt for user', key, 'to role creation time:', role.createdAt.toISOString());
                }
            }
        }
        // Add Everyone role to all members
        if (everyoneRole) {
            const projectRoles = roles.map((role) => ({
                id: role.id.toString(),
                name: role.name,
                permissionFlags: role.permissionFlags.value.toString(), // Ensure proper serialization
            }));
            // Add Everyone role to roles list
            projectRoles.push({
                id: everyoneRole.id.toString(),
                name: everyoneRole.name,
                permissionFlags: everyoneRole.permissionFlags.value.toString(), // Ensure proper serialization
            });
            // Add Everyone role to all members
            Object.values(memberMap).forEach((member) => {
                member.roles.push({
                    id: everyoneRole.id.toString(),
                    name: everyoneRole.name,
                    permissionFlags: everyoneRole.permissionFlags.value.toString(), // Ensure proper serialization
                });
            });
            return { members: Object.values(memberMap), projectRoles };
        }
        return {
            members: Object.values(memberMap),
            projectRoles: roles.map((role) => ({
                id: role.id.toString(),
                name: role.name,
                permissionFlags: role.permissionFlags.value.toString(), // Ensure proper serialization
            })),
        };
    }
    async createBranch(projectId, userId, displayName, fromBranchId, visibleToRoleIds) {
        await this.testPermissions(projectId, userId, common_2.PermissionFlags.ManageBranches);
        if (!fromBranchId) {
            const project = await this.projectRepository.findOneOrFail({
                where: { id: projectId },
                relations: ['defaultBranch'],
            });
            fromBranchId = project.defaultBranch.id;
        }
        const branch = this.branchRepository.create({
            name: '',
            project: { id: projectId },
            user: { id: userId },
        });
        if (visibleToRoleIds?.length) {
            const roles = await this.projectRoleRepository.find({
                where: { id: (0, typeorm_2.In)(visibleToRoleIds) },
            });
            branch.visibleToRoles = roles;
        }
        else {
            branch.visibleToRoles = [];
        }
        const savedBranch = await this.branchRepository.save(branch);
        const githubBranchName = `branch-${savedBranch.id}`;
        const baseBranchName = `branch-${fromBranchId}`;
        const repoName = `project-${projectId}`;
        try {
            await this.githubService.createBranch(repoName, githubBranchName, baseBranchName);
            // Push initial file để branch tồn tại trên GitHub
            await this.githubService.pushInitialFile({
                repo: repoName,
                path: 'README.md',
                message: 'Initial commit on new branch',
                content: `# Branch ${githubBranchName}`,
                branch: githubBranchName,
            });
        }
        catch (err) {
            // Nếu repo hoặc base branch chưa tồn tại, tạo repo và branch main trước
            if (err.status === 404) {
                // Tạo repo nếu chưa có
                try {
                    await this.githubService.createRepository(repoName, true);
                }
                catch (repoErr) {
                    if (repoErr.status !== 422)
                        throw repoErr; // 422: repo đã tồn tại
                }
                // Tạo branch main nếu chưa có
                try {
                    await this.githubService.createBranch(repoName, 'main', 'main');
                }
                catch (mainErr) {
                    // Nếu branch main đã tồn tại thì bỏ qua
                    if (mainErr.status !== 422 && mainErr.status !== 404)
                        throw mainErr;
                }
                // Thử lại tạo branch mới
                await this.githubService.createBranch(repoName, githubBranchName, baseBranchName);
                // Push initial file cho branch mới
                await this.githubService.pushInitialFile({
                    repo: repoName,
                    path: 'README.md',
                    message: 'Initial commit on new branch',
                    content: `# Branch ${githubBranchName}`,
                    branch: githubBranchName,
                });
            }
            else {
                throw err;
            }
        }
        savedBranch.name = displayName;
        return this.branchRepository.save(savedBranch);
    }
    async renameBranchName(branchId, userId, projectId, newName) {
        await this.testPermissions(projectId, userId, common_2.PermissionFlags.ManageBranches);
        const branch = await this.branchRepository.findOneOrFail({
            where: { id: branchId },
            relations: ['project'],
        });
        if (branch.project.id !== projectId) {
            throw new common_1.ForbiddenException('Branch does not belong to this project');
        }
        branch.name = newName;
        return this.branchRepository.save(branch);
    }
    async listBranchesForProject(projectId, userId) {
        console.log('listBranchesForProject called with projectId:', projectId, 'userId:', userId);
        await this.testPermissions(projectId, userId, common_2.PermissionFlags.ViewProject);
        const result = await this.branchRepository
            .createQueryBuilder('branch')
            .where('branch.projectId = :projectId', { projectId })
            .getMany();
        console.log('Branches for project', projectId, ':', result);
        return result;
    }
    async submitCommit(projectId, userId, branchId, filePath, content, message) {
        await this.testPermissions(projectId, userId, common_2.PermissionFlags.PushCommit);
        const commit = this.commitRepository.create({
            project: { id: projectId },
            branch: { id: branchId },
            author: { id: userId },
            message,
            contentSnapshot: content,
            filePath,
            status: Entities_1.CommitStatus.Pending,
        });
        return this.commitRepository.save(commit);
    }
    async reviewCommit(projectId, commitId, reviewerId, approve, reviewMessage) {
        await this.testPermissions(projectId, reviewerId, common_2.PermissionFlags.ReviewCommit);
        const commit = await this.commitRepository.findOneOrFail({
            where: { id: commitId },
            relations: ['project', 'branch'],
        });
        commit.status = approve ? Entities_1.CommitStatus.Approved : Entities_1.CommitStatus.Rejected;
        commit.reviewedByUserId = reviewerId;
        commit.reviewMessage = reviewMessage;
        await this.commitRepository.save(commit);
        if (approve) {
            const githubRepo = `project-${commit.project.id}`;
            // Lấy tên branch thực tế từ DB
            const branchEntity = await this.branchRepository.findOne({
                where: { id: commit.branch.id },
            });
            if (!branchEntity)
                throw new Error('Branch not found');
            const githubBranch = branchEntity.name;
            this.logger.log(`[GITHUB] Start pushing commit to GitHub: repo=${githubRepo}, branch=${githubBranch}, path=${commit.filePath}`);
            try {
                await this.githubService.commitChange({
                    repo: githubRepo,
                    branch: githubBranch,
                    path: commit.filePath,
                    content: commit.contentSnapshot,
                    message: commit.message,
                });
                this.logger.log(`[GITHUB] Successfully pushed commit to GitHub: repo=${githubRepo}, branch=${githubBranch}, path=${commit.filePath}`);
            }
            catch (err) {
                this.logger.error(`[GITHUB] Failed to push commit to GitHub: repo=${githubRepo}, branch=${githubBranch}, path=${commit.filePath}`, err);
                throw err;
            }
        }
        return commit;
    }
    async getLocalCommits(projectId, branchId) {
        return this.commitRepository.find({
            where: { project: { id: projectId }, branch: { id: branchId } },
            relations: ['author'],
            order: { createdAt: 'DESC' },
        });
    }
    async listCommits(projectId, branchId) {
        return this.githubService.listCommits(projectId, branchId);
    }
};
exports.ProjectManagerService = ProjectManagerService;
exports.ProjectManagerService = ProjectManagerService = ProjectManagerService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_1.InjectRepository)(Entities_1.CategoryEntity)),
    tslib_1.__param(1, (0, typeorm_1.InjectRepository)(Entities_1.ProjectEntity)),
    tslib_1.__param(2, (0, typeorm_1.InjectRepository)(Entities_1.UserEntity)),
    tslib_1.__param(3, (0, typeorm_1.InjectRepository)(Entities_1.ProjectRoleEntity)),
    tslib_1.__param(4, (0, typeorm_1.InjectRepository)(Entities_1.BranchEntity)),
    tslib_1.__param(5, (0, typeorm_1.InjectRepository)(Entities_1.CommitEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _d : Object, typeof (_e = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _e : Object, typeof (_f = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _f : Object, typeof (_g = typeof typeorm_2.DataSource !== "undefined" && typeorm_2.DataSource) === "function" ? _g : Object, typeof (_h = typeof github_manager_service_1.GitHubService !== "undefined" && github_manager_service_1.GitHubService) === "function" ? _h : Object, typeof (_j = typeof notification_manager_service_1.NotificationManagerService !== "undefined" && notification_manager_service_1.NotificationManagerService) === "function" ? _j : Object])
], ProjectManagerService);
function normalizePermission(input) {
    if (typeof input === 'bigint')
        return input;
    if (typeof input === 'number')
        return BigInt(input);
    if (typeof input === 'string') {
        return common_2.PermissionFlags[input] ?? 0n;
    }
    return input.value;
    throw new Error('Invalid permission input type');
}


/***/ }),
/* 91 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CommonHttpServiceImpl = void 0;
const common_1 = __webpack_require__(2);
/** Base class for all HTTP-interfacing services (that throws `HttpExceptions`). */
class CommonHttpServiceImpl {
    unknownErrorHanlder(error, message = '') {
        const _message = message || 'An unknown error occurred';
        this.logger.error(`${_message}: ` + (error?.message ?? 'Unknown error'));
        throw new common_1.InternalServerErrorException(_message);
    }
}
exports.CommonHttpServiceImpl = CommonHttpServiceImpl;


/***/ }),
/* 92 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitHubService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(5);
const buffer_1 = __webpack_require__(93);
const common_2 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const Entities_1 = __webpack_require__(16);
const typeorm_2 = __webpack_require__(15);
let GitHubService = class GitHubService {
    constructor(configService) {
        this.configService = configService;
    }
    async initOctokit() {
        if (!this.octokit) {
            const { Octokit } = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 166, 23));
            const githubToken = this.configService.get('GITHUB_PAT');
            this.username = this.configService.get('GITHUB_USERNAME');
            this.octokit = new Octokit({ auth: githubToken });
        }
    }
    async repoExists(repoName) {
        await this.initOctokit();
        try {
            await this.octokit.rest.repos.get({
                owner: this.username,
                repo: repoName,
            });
            return true;
        }
        catch (error) {
            if (error.status === 404)
                return false;
            throw error;
        }
    }
    async createRepository(repoName, isPrivate = true) {
        await this.initOctokit();
        const exists = await this.repoExists(repoName);
        if (exists) {
            throw new common_2.BadRequestException('Project name already existed on Github.');
        }
        const res = await this.octokit.rest.repos.createForAuthenticatedUser({
            name: repoName,
            private: isPrivate,
            auto_init: false,
        });
        return res.data;
    }
    async pushInitialFile({ repo, path, content, message, branch = 'main', }) {
        await this.initOctokit();
        const base64Content = buffer_1.Buffer.isBuffer(content)
            ? content.toString('base64')
            : buffer_1.Buffer.from(content, 'utf8').toString('base64');
        let sha;
        try {
            const { data } = await this.octokit.repos.getContent({
                owner: this.username,
                repo,
                path,
                ref: branch,
            });
            if (!Array.isArray(data) && 'sha' in data) {
                sha = data.sha;
            }
        }
        catch (error) {
            if (error.status !== 404)
                throw error;
        }
        await this.octokit.rest.repos.createOrUpdateFileContents({
            owner: this.username,
            repo,
            path,
            message,
            content: base64Content,
            branch,
            sha,
        });
    }
    async deleteRepository(repoName) {
        await this.initOctokit();
        try {
            const user = await this.octokit.rest.users.getAuthenticated();
            await this.octokit.rest.repos.delete({
                owner: user.data.login,
                repo: repoName,
            });
        }
        catch (err) {
            if (err.status === 404) {
                throw new Error(`Repository ${repoName} not found on GitHub`);
            }
            else {
                throw new Error(`GitHub deletion failed: ${err.message}`);
            }
        }
    }
    async commitChange(options) {
        await this.initOctokit();
        const { repo, branch = 'main', path, content, message, isBase64 = false, } = options;
        const encodedContent = isBase64
            ? typeof content === 'string'
                ? content
                : content.toString()
            : buffer_1.Buffer.isBuffer(content)
                ? content.toString('base64')
                : buffer_1.Buffer.from(content).toString('base64');
        let sha;
        try {
            const { data } = await this.octokit.repos.getContent({
                owner: this.username,
                repo,
                path,
                ref: branch,
            });
            if (!Array.isArray(data)) {
                sha = data.sha;
            }
        }
        catch (err) {
            if (err.status !== 404) {
                throw err;
            }
        }
        await this.octokit.repos.createOrUpdateFileContents({
            owner: this.username,
            repo,
            path,
            message,
            content: encodedContent,
            branch,
            sha,
        });
    }
    async createBranch(repo, branchName, fromBranch = 'main') {
        await this.initOctokit();
        const baseBranch = await this.octokit.rest.repos.getBranch({
            owner: this.username,
            repo,
            branch: fromBranch,
        });
        await this.octokit.rest.git.createRef({
            owner: this.username,
            repo,
            ref: `refs/heads/${branchName}`,
            sha: baseBranch.data.commit.sha,
        });
    }
    async mergeBranch({ repo, base, head, commitMessage, }) {
        await this.initOctokit();
        const { data } = await this.octokit.rest.repos.merge({
            owner: this.username,
            repo,
            base,
            head,
            commit_message: commitMessage,
        });
        return data;
    }
    async listCommits(projectId, branchId) {
        const localCommits = (await this.commitRepository?.find)
            ? await this.commitRepository.find({
                where: { project: { id: projectId }, branch: { id: branchId } },
                relations: ['author'],
                order: { createdAt: 'DESC' },
            })
            : [];
        return localCommits.map((c) => ({
            id: c.id,
            message: c.message,
            filePath: c.filePath,
            status: c.status,
            author: {
                id: c.author?.id,
                username: c.author?.username,
                fullName: c.author?.fullName,
            },
            createdAt: c.createdAt,
            reviewMessage: c.reviewMessage,
            contentSnapshot: c.contentSnapshot,
        }));
    }
    async fetchAllBranch(projectId) {
        const branch = await this.branchRepository.find({
            where: { project: { id: projectId } },
        });
        if (!branch) {
            console.log('no branch found');
        }
        return branch;
    }
};
exports.GitHubService = GitHubService;
tslib_1.__decorate([
    (0, typeorm_1.InjectRepository)(Entities_1.BranchEntity),
    tslib_1.__metadata("design:type", typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object)
], GitHubService.prototype, "branchRepository", void 0);
exports.GitHubService = GitHubService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], GitHubService);


/***/ }),
/* 93 */
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),
/* 94 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NotificationManagerService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(15);
const Entities_1 = __webpack_require__(16);
const notification_gateway_1 = __webpack_require__(95);
let NotificationManagerService = class NotificationManagerService {
    constructor(notificationRepository, userRepository, notificationGateway) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.notificationGateway = notificationGateway;
    }
    async createNotification(data) {
        const notification = this.notificationRepository.create({
            userId: data.userId,
            type: data.type,
            message: data.message,
            isGlobal: data.isGlobal || false,
            createdBy: data.createdBy,
        });
        const savedNotification = await this.notificationRepository.save(notification);
        // Send realtime notification
        try {
            if (data.isGlobal) {
                this.notificationGateway.emitToAll({
                    id: savedNotification.id.toString(),
                    type: savedNotification.type,
                    message: savedNotification.message,
                    createdAt: savedNotification.createdAt,
                    isGlobal: true,
                });
            }
            else if (data.userId) {
                this.notificationGateway.emitToUser(data.userId, {
                    id: savedNotification.id.toString(),
                    type: savedNotification.type,
                    message: savedNotification.message,
                    createdAt: savedNotification.createdAt,
                    isGlobal: false,
                });
            }
        }
        catch (error) {
            console.error('Failed to send realtime notification:', error);
            // Don't fail the notification creation if realtime fails
        }
        return savedNotification;
    }
    async createGlobalNotification(data) {
        return this.createNotification({
            type: data.type,
            message: data.message,
            isGlobal: true,
            createdBy: data.createdBy,
        });
    }
    async createNotificationForAllUsers(data) {
        // Get all active users
        const users = await this.userRepository.find({
            where: { isActive: true },
            select: ['id'],
        });
        const notifications = [];
        // Create individual notifications for each user
        for (const user of users) {
            const notification = await this.createNotification({
                userId: user.id,
                type: data.type,
                message: data.message,
                createdBy: data.createdBy,
                isGlobal: false,
            });
            notifications.push(notification);
        }
        return notifications;
    }
    async getNotificationsByUserId(userId, limit = 50, unreadOnly = false) {
        const whereConditions = [
            { userId, ...(unreadOnly ? { isRead: false } : {}) },
            { isGlobal: true, ...(unreadOnly ? { isRead: false } : {}) },
        ];
        return await this.notificationRepository.find({
            where: whereConditions,
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['creator'],
        });
    }
    async getAllGlobalNotifications(limit = 50) {
        return await this.notificationRepository.find({
            where: { isGlobal: true },
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['creator'],
        });
    }
    async getNotificationById(id) {
        const notification = await this.notificationRepository.findOne({
            where: { id },
            relations: ['user', 'creator'],
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        return notification;
    }
    async updateNotification(id, data) {
        const notification = await this.getNotificationById(id);
        if (data.type !== undefined) {
            notification.type = data.type;
        }
        if (data.message !== undefined) {
            notification.message = data.message;
        }
        const updatedNotification = await this.notificationRepository.save(notification);
        // TODO: Send realtime update
        // if (notification.isGlobal) {
        //   this.notificationGateway.emitToAll({
        //     id: updatedNotification.id.toString(),
        //     type: updatedNotification.type,
        //     message: updatedNotification.message,
        //     createdAt: updatedNotification.createdAt,
        //     isGlobal: true,
        //   });
        // } else if (notification.userId) {
        //   this.notificationGateway.emitToUser(notification.userId, {
        //     id: updatedNotification.id.toString(),
        //     type: updatedNotification.type,
        //     message: updatedNotification.message,
        //     createdAt: updatedNotification.createdAt,
        //     isGlobal: false,
        //   });
        // }
        return updatedNotification;
    }
    async deleteNotification(id) {
        const idStr = id.toString();
        const notification = await this.getNotificationById(id);
        const result = await this.notificationRepository.delete(idStr);
        if (result.affected === 0) {
            throw new common_1.NotFoundException('Notification not found');
        }
        // Send realtime deletion notification
        try {
            if (notification.isGlobal) {
                this.notificationGateway.emitDeletionToAll(id.toString());
            }
            else if (notification.userId) {
                this.notificationGateway.emitDeletionToUser(notification.userId, id.toString());
            }
        }
        catch (error) {
            console.error('Failed to send realtime deletion notification:', error);
            // Don't fail the deletion if realtime fails
        }
    }
    async deleteAllUserNotifications(userId) {
        await this.notificationRepository.delete({ userId });
        // Send realtime deletion notification
        try {
            this.notificationGateway.emitDeletionToUser(userId, 'all_user');
        }
        catch (error) {
            console.error('Failed to send realtime deletion notification:', error);
            // Don't fail the deletion if realtime fails
        }
    }
    async deleteAllGlobalNotifications() {
        await this.notificationRepository.delete({ isGlobal: true });
        // Send realtime deletion notification
        try {
            this.notificationGateway.emitDeletionToAll('all_global');
        }
        catch (error) {
            console.error('Failed to send realtime deletion notification:', error);
            // Don't fail the deletion if realtime fails
        }
    }
    async getNotificationCount(userId) {
        return await this.notificationRepository.count({
            where: [{ userId }, { isGlobal: true }],
        });
    }
    async getUnreadNotificationCount(userId) {
        return await this.notificationRepository.count({
            where: [
                { userId, isRead: false },
                { isGlobal: true, isRead: false },
            ],
        });
    }
    async markAsRead(notificationId, userId) {
        const notification = await this.getNotificationById(notificationId);
        // Check if user has access to this notification
        if (!notification.isGlobal && notification.userId !== userId) {
            throw new Error('Unauthorized access to notification');
        }
        // Only mark as read if not already read
        if (!notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date();
            await this.notificationRepository.save(notification);
        }
    }
    async markAllAsRead(userId) {
        await this.notificationRepository.update([
            { userId, isRead: false },
            { isGlobal: true, isRead: false },
        ], {
            isRead: true,
            readAt: new Date(),
        });
    }
    async getGlobalNotificationCount() {
        return await this.notificationRepository.count({
            where: { isGlobal: true },
        });
    }
    // Helper methods for common notification types
    async notifyUserRequestStatus(userId, requestTitle, status) {
        return this.createNotification({
            userId,
            type: 'request_status',
            message: `Your request "${requestTitle}" has been ${status}`,
        });
    }
    async notifyUserProjectInvite(userId, projectName) {
        return this.createNotification({
            userId,
            type: 'project_invite',
            message: `You have been invited to join project "${projectName}"`,
        });
    }
    async notifyUserNewMessage(userId, fromUser) {
        return this.createNotification({
            userId,
            type: 'new_message',
            message: `You have a new message from ${fromUser}`,
        });
    }
};
exports.NotificationManagerService = NotificationManagerService;
exports.NotificationManagerService = NotificationManagerService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_1.InjectRepository)(Entities_1.NotificationEntity)),
    tslib_1.__param(1, (0, typeorm_1.InjectRepository)(Entities_1.UserEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof notification_gateway_1.NotificationGateway !== "undefined" && notification_gateway_1.NotificationGateway) === "function" ? _c : Object])
], NotificationManagerService);


/***/ }),
/* 95 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var NotificationGateway_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NotificationGateway = void 0;
const tslib_1 = __webpack_require__(1);
const websockets_1 = __webpack_require__(96);
const socket_io_1 = __webpack_require__(97);
const common_1 = __webpack_require__(2);
let NotificationGateway = NotificationGateway_1 = class NotificationGateway {
    constructor() {
        this.logger = new common_1.Logger(NotificationGateway_1.name);
        this.userSockets = new Map(); // userId -> socketIds[]
    }
    handleConnection(client) {
        this.logger.log(`✅ Notification client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`❌ Notification client disconnected: ${client.id}`);
        // Remove socket from user mapping
        for (const [userId, socketIds] of this.userSockets.entries()) {
            const index = socketIds.indexOf(client.id);
            if (index > -1) {
                socketIds.splice(index, 1);
                if (socketIds.length === 0) {
                    this.userSockets.delete(userId);
                }
                break;
            }
        }
    }
    async handleJoinUserRoom(userId, client) {
        this.logger.log(`👤 Client ${client.id} joining user room: ${userId}`);
        // Join user-specific room
        client.join(`user_${userId}`);
        // Track socket for this user
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, []);
        }
        this.userSockets.get(userId)?.push(client.id);
        client.emit('joined_user_room', userId);
    }
    // Send notification to specific user
    emitToUser(userId, notification) {
        const userIdStr = userId.toString();
        this.logger.log(`📤 Sending notification to user ${userIdStr}: ${notification.message}`);
        this.server.to(`user_${userIdStr}`).emit('new_notification', notification);
    }
    // Send notification to all connected users (global notification)
    emitToAll(notification) {
        this.logger.log(`📢 Broadcasting global notification: ${notification.message}`);
        this.server.emit('global_notification', notification);
    }
    // Send deletion notification to specific user
    emitDeletionToUser(userId, notificationId) {
        const userIdStr = userId.toString();
        this.logger.log(`🗑️ Sending deletion notification to user ${userIdStr}: ${notificationId}`);
        this.server.to(`user_${userIdStr}`).emit('notification_deleted', { id: notificationId });
    }
    // Send deletion notification to all users (global notification)
    emitDeletionToAll(notificationId) {
        this.logger.log(`🗑️ Broadcasting global deletion notification: ${notificationId}`);
        this.server.emit('notification_deleted', { id: notificationId });
    }
    // Get connected users count
    getConnectedUsersCount() {
        return this.userSockets.size;
    }
    // Check if user is online
    isUserOnline(userId) {
        return this.userSockets.has(userId);
    }
};
exports.NotificationGateway = NotificationGateway;
tslib_1.__decorate([
    (0, websockets_1.WebSocketServer)(),
    tslib_1.__metadata("design:type", typeof (_a = typeof socket_io_1.Server !== "undefined" && socket_io_1.Server) === "function" ? _a : Object)
], NotificationGateway.prototype, "server", void 0);
tslib_1.__decorate([
    (0, websockets_1.SubscribeMessage)('join_user_room'),
    tslib_1.__param(0, (0, websockets_1.MessageBody)()),
    tslib_1.__param(1, (0, websockets_1.ConnectedSocket)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, typeof (_b = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _b : Object]),
    tslib_1.__metadata("design:returntype", Promise)
], NotificationGateway.prototype, "handleJoinUserRoom", null);
exports.NotificationGateway = NotificationGateway = NotificationGateway_1 = tslib_1.__decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/notifications',
        path: '/api/notifications/socket.io',
        cors: {
            origin: [
                'http://localhost:4200', // Always allow localhost for development
                process.env.CLIENT_URL || 'http://localhost:4200',
                process.env.PRODUCTION_URL || 'https://htt-ekpa.onrender.com',
                /^http:\/\/26\.82\.216\.\d+:4200$/ // Allow any IP in RadVPN range
            ],
            credentials: true,
            methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
    })
], NotificationGateway);


/***/ }),
/* 96 */
/***/ ((module) => {

module.exports = require("@nestjs/websockets");

/***/ }),
/* 97 */
/***/ ((module) => {

module.exports = require("socket.io");

/***/ }),
/* 98 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WalletManagerService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(15);
const Entities_1 = __webpack_require__(16);
const Entities_2 = __webpack_require__(16);
let WalletManagerService = class WalletManagerService {
    constructor(walletRepository, transactionRepository) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }
    async onModuleInit() {
        await this.syncAllWalletBalances();
    }
    async getOrCreateWallet(userId) {
        let wallet = await this.walletRepository.findOne({
            where: { user: { id: userId } },
            relations: ['user'],
        });
        if (!wallet) {
            wallet = this.walletRepository.create({
                user: { id: userId },
                balance: 0,
            });
            await this.walletRepository.save(wallet);
        }
        return wallet;
    }
    async addToBalance(userId, amount) {
        if (amount <= 0)
            throw new common_1.BadRequestException('Amount must be positive');
        const wallet = await this.getOrCreateWallet(userId);
        wallet.balance = Number(wallet.balance) + Number(amount);
        return this.walletRepository.save(wallet);
    }
    async updatePaypalEmailByWalletId(walletId, paypalEmail) {
        const wallet = await this.walletRepository.findOneOrFail({
            where: { id: walletId },
        });
        wallet.paypalEmail = paypalEmail;
        return this.walletRepository.save(wallet);
    }
    async getWalletDetails(userId) {
        const wallet = await this.getOrCreateWallet(userId);
        // Tổng tiền đã nạp (tất cả transaction deposit, không lọc status)
        const totalDeposits = await this.transactionRepository
            .createQueryBuilder('t')
            .where('t.user = :userId', { userId })
            .andWhere('t.amount > 0')
            .select('SUM(t.amount)', 'sum')
            .getRawOne();
        // Tổng tiền đã rút
        const totalWithdrawn = await this.transactionRepository
            .createQueryBuilder('t')
            .where('t.user = :userId', { userId })
            .andWhere('t.amount < 0')
            .andWhere('t.status IN (:...statuses)', {
            statuses: [Entities_2.TransactionStatus.Completed, Entities_2.TransactionStatus.Approved],
        })
            .select('SUM(ABS(t.amount))', 'sum')
            .getRawOne();
        // Số tiền đang chờ rút
        const pendingWithdrawals = await this.transactionRepository
            .createQueryBuilder('t')
            .where('t.user = :userId', { userId })
            .andWhere('t.amount < 0')
            .andWhere('t.status = :pending', { pending: Entities_2.TransactionStatus.Pending })
            .select('SUM(ABS(t.amount))', 'sum')
            .getRawOne();
        // Số tiền đang giữ (hold) cho các yêu cầu chưa hoàn thành
        const holdAmount = await this.transactionRepository
            .createQueryBuilder('t')
            .where('t.user = :userId', { userId })
            .andWhere('t.status IN (:...statuses)', {
            statuses: [
                Entities_2.TransactionStatus.Pending,
                Entities_2.TransactionStatus.WaitingApproval,
            ],
        })
            .select('SUM(t.amount)', 'sum')
            .getRawOne();
        // Tính balance động (bao gồm cả ON_HOLD và APPROVED)
        const balance = Number(totalDeposits?.sum || 0) - Number(totalWithdrawn?.sum || 0);
        return {
            ...wallet,
            balance,
            totalDeposits: Number(totalDeposits?.sum || 0),
            totalWithdrawn: Number(totalWithdrawn?.sum || 0),
            pendingWithdrawals: Number(pendingWithdrawals?.sum || 0),
            holdAmount: Number(holdAmount?.sum || 0),
        };
    }
    async getLatestTransaction(userId) {
        const txns = await this.transactionRepository.find({
            where: {
                user: { id: userId },
                status: (0, typeorm_2.In)([Entities_2.TransactionStatus.Completed, Entities_2.TransactionStatus.Approved]),
            },
            order: { createdAt: 'DESC' },
            relations: ['user', 'request'],
        });
        const txn = txns.find((t) => Number(t.amount) !== 0);
        if (!txn)
            return null;
        // Xác định type dựa trên logic mới
        let type = 'Deposit';
        if (txn.amount < 0) {
            type = 'Withdraw';
        }
        else if (txn.amount > 0 && txn.request) {
            type = 'Payment';
        }
        return {
            id: txn.id,
            amount: txn.amount,
            status: txn.status,
            createdAt: txn.createdAt instanceof Date
                ? txn.createdAt.toISOString()
                : txn.createdAt,
            type: type,
        };
    }
    async getPendingWithdrawals(userId) {
        return this.transactionRepository
            .createQueryBuilder('t')
            .where('t.userId = :userId', { userId })
            .andWhere('t.amount < 0')
            .andWhere('t.status = :status', { status: Entities_2.TransactionStatus.Pending })
            .orderBy('t.createdAt', 'DESC')
            .getMany();
    }
    async linkPaypal(userId, paypalEmail) {
        const wallet = await this.getOrCreateWallet(userId);
        wallet.paypalEmail = paypalEmail;
        await this.walletRepository.save(wallet);
    }
    // Đồng bộ balance cho tất cả ví dựa trên transaction deposit đã hoàn thành
    async syncAllWalletBalances() {
        const wallets = await this.walletRepository.find({ relations: ['user'] });
        for (const wallet of wallets) {
            const totalDeposit = await this.transactionRepository
                .createQueryBuilder('t')
                .where('t.user = :userId', { userId: wallet.user.id })
                .andWhere('t.amount > 0')
                .andWhere('t.status IN (:...statuses)', { statuses: ['APPROVED'] }) // Only APPROVED deposits are released
                .select('SUM(t.amount)', 'sum')
                .getRawOne();
            wallet.balance = Number(totalDeposit?.sum || 0);
            await this.walletRepository.save(wallet);
        }
        return { success: true };
    }
    // Lấy lịch sử giao dịch của user bằng queryBuilder để lấy requesterId raw
    async getUserTransactions(userId) {
        console.log('getUserTransactions userId:', userId, typeof userId);
        const qb = this.transactionRepository
            .createQueryBuilder('t')
            .leftJoinAndSelect('t.user', 'user')
            .leftJoinAndSelect('t.request', 'request')
            .leftJoinAndSelect('request.assignee', 'assignee')
            .leftJoinAndSelect('request.project', 'project')
            .leftJoinAndSelect('project.createdBy', 'projectCreator')
            .addSelect('request.requesterId', 'request_requesterId')
            .where('user.id = :userId', { userId: Number(userId) })
            .orderBy('t.createdAt', 'DESC');
        const txnsRaw = await qb.getRawAndEntities();
        const mappedTxns = txnsRaw.entities.map((txn, idx) => {
            const requesterId = String(txnsRaw.raw[idx]['request_requesterId']);
            const userId = String(txn.user?.id);
            const result = userId === requesterId;
            // Populate project info if available
            let project = undefined;
            if (txn.request && txn.request.project) {
                project = {
                    id: txn.request.project.id?.toString() || null,
                    name: txn.request.project.name || null,
                    status: txn.request.status || null,
                    assignee: txn.request.assignee
                        ? {
                            id: txn.request.assignee.id?.toString() || null,
                            fullName: txn.request.assignee.fullName || null,
                            email: txn.request.assignee.email || null,
                            phone: txn.request.assignee.phone || null,
                        }
                        : null,
                };
            }
            return {
                ...txn,
                createdAt: txn.createdAt instanceof Date
                    ? txn.createdAt.toISOString()
                    : txn.createdAt,
                paypalEmail: txn.paypalEmail || null,
                status: txn.amount > 0 &&
                    txn.status !== Entities_2.TransactionStatus.Approved &&
                    txn.status !== Entities_2.TransactionStatus.Completed
                    ? Entities_2.TransactionStatus.On_Hold
                    : txn.status,
                requestId: txn.request?.id?.toString() || null,
                isRequester: result,
                request: txn.request
                    ? {
                        ...txn.request,
                        project,
                    }
                    : undefined,
                debug: {
                    hasRequest: !!txn.request,
                    hasAssignee: !!txn.request?.assignee,
                    assigneeId: txn.request?.assignee?.id,
                    userId: txn.user?.id,
                    isAssignee: txn.request?.assignee?.id === txn.user?.id,
                },
            };
        });
        console.log('✅ getUserTransactions for userId:', userId, 'Found transactions:', mappedTxns.map((t) => ({
            id: t.id,
            amount: t.amount,
            status: t.status,
            requestId: t.requestId,
            isRequester: t.isRequester,
            userEmail: t.user?.email,
            type: t.amount > 0
                ? t.requestId
                    ? t.isRequester
                        ? 'Deposit'
                        : 'Payment'
                    : 'Deposit'
                : 'Withdrawal',
            debug: t.debug,
        })));
        return mappedTxns;
    }
    // Lấy tất cả giao dịch (cho admin)
    async getAllTransactions() {
        const txns = await this.transactionRepository.find({
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
        return txns.map((txn) => ({
            ...txn,
            createdAt: txn.createdAt instanceof Date
                ? txn.createdAt.toISOString()
                : txn.createdAt,
        }));
    }
    // Lấy giao dịch theo filter (cho admin)
    async getTransactionsWithFilters(filters) {
        const queryBuilder = this.transactionRepository
            .createQueryBuilder('t')
            .leftJoinAndSelect('t.user', 'user')
            .leftJoinAndSelect('t.request', 'request')
            .leftJoinAndSelect('request.project', 'project')
            .orderBy('t.createdAt', 'DESC');
        if (filters.userId) {
            queryBuilder.andWhere('t.user.id = :userId', { userId: filters.userId });
        }
        if (filters.type) {
            if (filters.type === 'deposit') {
                queryBuilder.andWhere('t.amount > 0');
            }
            else if (filters.type === 'withdraw') {
                queryBuilder.andWhere('t.amount < 0');
            }
        }
        if (filters.status) {
            queryBuilder.andWhere('t.status = :status', { status: filters.status });
        }
        if (filters.minAmount !== undefined) {
            queryBuilder.andWhere('ABS(t.amount) >= :minAmount', {
                minAmount: filters.minAmount,
            });
        }
        if (filters.maxAmount !== undefined) {
            queryBuilder.andWhere('ABS(t.amount) <= :maxAmount', {
                maxAmount: filters.maxAmount,
            });
        }
        if (filters.startDate) {
            queryBuilder.andWhere('t.createdAt >= :startDate', {
                startDate: filters.startDate,
            });
        }
        if (filters.endDate) {
            queryBuilder.andWhere('t.createdAt <= :endDate', {
                endDate: filters.endDate,
            });
        }
        const txns = await queryBuilder.getMany();
        return txns.map((txn) => ({
            ...txn,
            createdAt: txn.createdAt instanceof Date
                ? txn.createdAt.toISOString()
                : txn.createdAt,
            requestId: txn.request?.id?.toString() || null,
            projectId: txn.request?.project?.id?.toString() || null,
        }));
    }
};
exports.WalletManagerService = WalletManagerService;
exports.WalletManagerService = WalletManagerService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_1.InjectRepository)(Entities_1.WalletEntity)),
    tslib_1.__param(1, (0, typeorm_1.InjectRepository)(Entities_2.TransactionEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object])
], WalletManagerService);


/***/ }),
/* 99 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ManifestService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const mongoose_1 = __webpack_require__(41);
const mongoose_2 = __webpack_require__(42);
const translation_schema_1 = __webpack_require__(100);
const uuid_1 = __webpack_require__(48);
const axios_1 = tslib_1.__importDefault(__webpack_require__(89));
const form_data_1 = tslib_1.__importDefault(__webpack_require__(101));
const pdfjs = tslib_1.__importStar(__webpack_require__(102));
const path = tslib_1.__importStar(__webpack_require__(103));
const mammoth_1 = tslib_1.__importDefault(__webpack_require__(104));
// Hàm mới sử dụng OCR.space API
async function extractTextWithOcrSpace(fileBuffer, apiKey) {
    try {
        const form = new form_data_1.default();
        form.append('apikey', apiKey);
        form.append('isOverlayRequired', 'false');
        form.append('file', fileBuffer, {
            filename: 'file.pdf',
            contentType: 'application/pdf',
        });
        form.append('language', 'eng');
        const response = await axios_1.default.post('https://api.ocr.space/parse/image', form, {
            headers: form.getHeaders(),
        });
        if (response.data &&
            response.data.ParsedResults &&
            response.data.ParsedResults.length > 0) {
            return response.data.ParsedResults.map((result) => result.ParsedText).join('\n');
        }
        return '';
    }
    catch (error) {
        console.error('OCR.space API error:', error?.response ? error.response.data : error?.message || error);
        throw new Error('Failed to extract text using OCR service.');
    }
}
function groupTextByLine(items, yThreshold = 5) {
    if (!items.length) {
        return [];
    }
    // Sắp xếp các item theo tọa độ y trước, sau đó là x.
    items.sort((a, b) => a.y - b.y || a.x - b.x);
    const lines = [];
    let currentLine = [items[0]];
    for (let i = 1; i < items.length; i++) {
        const currentItem = items[i];
        // Dùng tọa độ Y của item ĐẦU TIÊN làm mốc để tránh bị "trôi" dòng.
        const lineBaseY = currentLine[0].y;
        if (Math.abs(currentItem.y - lineBaseY) < yThreshold) {
            // Item đủ gần, thêm vào dòng hiện tại.
            currentLine.push(currentItem);
        }
        else {
            // Item ở quá xa, đây là dòng mới.
            // Sắp xếp lại dòng vừa hoàn thành theo tọa độ x để đảm bảo thứ tự.
            currentLine.sort((a, b) => a.x - b.x);
            lines.push(currentLine);
            // Bắt đầu dòng mới.
            currentLine = [currentItem];
        }
    }
    // Đừng quên dòng cuối cùng.
    if (currentLine.length > 0) {
        currentLine.sort((a, b) => a.x - b.x);
        lines.push(currentLine);
    }
    // Bây giờ, xử lý từng dòng để ghép các mẩu text lại.
    return lines.map((lineItems) => {
        let lineText = '';
        if (lineItems.length > 0) {
            lineText = lineItems[0].text;
            for (let i = 1; i < lineItems.length; i++) {
                const prev = lineItems[i - 1];
                const curr = lineItems[i];
                const spaceThreshold = (prev.height || 10) * 0.25;
                const gap = curr.x - (prev.x + (prev.width || 0));
                if (gap > spaceThreshold) {
                    lineText += ' ';
                }
                lineText += curr.text;
            }
        }
        return {
            text: lineText,
            items: lineItems, // Giữ lại các item gốc của dòng
        };
    });
}
// Hàm mới để chia part theo trang
function assignFilePartsByPage(manifestEntries) {
    // Nhóm các entries theo trang
    const entriesByPage = new Map();
    for (const entry of manifestEntries) {
        const page = entry.position?.page || 1; // Mặc định page 1 nếu không có thông tin trang
        if (!entriesByPage.has(page)) {
            entriesByPage.set(page, []);
        }
        entriesByPage.get(page).push(entry);
    }
    // Gán filePart theo số trang
    const sortedPages = Array.from(entriesByPage.keys()).sort((a, b) => a - b);
    for (let i = 0; i < sortedPages.length; i++) {
        const page = sortedPages[i];
        const entries = entriesByPage.get(page);
        for (const entry of entries) {
            entry.filePart = i; // Bắt đầu từ 0
        }
    }
}
let ManifestService = class ManifestService {
    constructor(translationModel) {
        this.translationModel = translationModel;
    }
    async generateManifest(file) {
        // Check if file has required project and branch relationships
        if (!file.project || !file.branch) {
            console.warn(`Skipping manifest generation for file ${file.id}: missing project or branch relationship`);
            return;
        }
        const manifestEntries = [];
        const apiKey = 'K89333403988957';
        switch (file.fileType) {
            case 'application/pdf': {
                let text = '';
                let usedOcr = false;
                let items = [];
                try {
                    // 1. Thử dùng parser trước để giữ layout
                    const result = await parsePdfWithFonts(file.fileContent);
                    items = result.items;
                    if (items && items.length > 0) {
                        console.log('[PDF] Parsed with pdf2json, found', items.length, 'items');
                    }
                    else {
                        throw new Error('No text found with parser, falling back to OCR.');
                    }
                }
                catch (err) {
                    // 2. Nếu parser lỗi -> Fallback sang OCR.space
                    try {
                        text = await extractTextWithOcrSpace(file.fileContent, apiKey);
                        usedOcr = true;
                        if (usedOcr) {
                            console.log('[PDF] Used OCR to extract text.');
                        }
                        console.log('[PDF][OCR.space] Text extracted:', text ? text.slice(0, 200) : '[EMPTY]');
                    }
                    catch (ocrError) {
                        console.error('[PDF][OCR.space] OCR failed:', ocrError?.message || ocrError);
                        throw new Error('Failed to extract text from PDF: ' +
                            (ocrError?.message || ocrError));
                    }
                    console.log(err);
                }
                if (items && items.length > 0) {
                    // Group các đoạn text lại thành dòng
                    const groupedLines = groupTextByLine(items, 5); // Tăng threshold lên 5 để linh hoạt hơn
                    for (const lineObj of groupedLines) {
                        manifestEntries.push({
                            projectId: String(file.project.id),
                            branchId: String(file.branch.id),
                            fileId: String(file.id),
                            manifestEntryId: (0, uuid_1.v4)(),
                            originalText: lineObj.text,
                            language: 'en',
                            font: lineObj.items[0]?.font || 'default',
                            // fontSize: lineObj.items[0]?.fontSize,
                            style: {
                                bold: lineObj.items.some((i) => i.bold),
                                italic: lineObj.items.some((i) => i.italic),
                                color: lineObj.items[0]?.color,
                            },
                            position: {
                                x: Math.min(...lineObj.items.map((i) => i.x)),
                                y: Math.min(...lineObj.items.map((i) => i.y)),
                                page: lineObj.items[0]?.page,
                            },
                        });
                    }
                    console.log('[PDF] manifestEntries from parser (grouped lines):', manifestEntries.length);
                }
                else if (text) {
                    // Xử lý kết quả text thô từ OCR
                    const lines = text.split('\n').filter((l) => l.trim());
                    for (const line of lines) {
                        manifestEntries.push({
                            projectId: String(file.project.id),
                            branchId: String(file.branch.id),
                            fileId: String(file.id),
                            manifestEntryId: (0, uuid_1.v4)(),
                            originalText: line,
                            language: 'en',
                            font: 'default',
                            style: {},
                            position: { x: 0, y: 0 },
                        });
                    }
                    console.log('[PDF][OCR.space] manifestEntries from OCR:', manifestEntries.length);
                }
                else {
                    console.error('[PDF] No text extracted from PDF (parser and OCR failed)');
                    throw new Error('No text could be extracted from PDF (parser and OCR failed)');
                }
                break;
            }
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
                // Sử dụng mammoth để extract HTML giữ bố cục logic
                const { value: html } = await mammoth_1.default.convertToHtml({
                    buffer: file.fileContent,
                });
                // Parse HTML để tách từng đoạn, heading, bảng, list, caption, v.v.
                const cheerio = __webpack_require__(105);
                const $ = cheerio.load(html);
                let pictureCount = 1;
                // Tách từng đoạn, heading, cell, list item, caption, th, blockquote, pre, figcaption
                const selectors = 'p, h1, h2, h3, h4, h5, h6, li, td, caption, th, blockquote, pre, figcaption';
                $(selectors).each((i, el) => {
                    const html = $(el).html()?.trim(); // Lấy innerHTML để giữ tag con
                    // Bỏ qua nếu chỉ là ảnh (không có text nào ngoài <img>)
                    const textOnly = $(el).text().trim();
                    // Nếu đoạn chỉ chứa <img> (không có text), tạo entry Picture N
                    if ($(el).find('img').length > 0 &&
                        (!textOnly || textOnly.length === 0)) {
                        $(el)
                            .find('img')
                            .each((_j, _img) => {
                            manifestEntries.push({
                                projectId: String(file.project.id),
                                branchId: String(file.branch.id),
                                fileId: String(file.id),
                                manifestEntryId: (0, uuid_1.v4)(),
                                originalText: `Picture ${pictureCount}`,
                                language: 'en',
                                font: 'default',
                                style: {},
                                position: { x: 0, y: 0 },
                            });
                            pictureCount++;
                        });
                    }
                    else if (html && (textOnly.length > 0 || /<img/i.test(html))) {
                        // Đoạn có text hoặc vừa text vừa ảnh, giữ nguyên innerHTML
                        manifestEntries.push({
                            projectId: String(file.project.id),
                            branchId: String(file.branch.id),
                            fileId: String(file.id),
                            manifestEntryId: (0, uuid_1.v4)(),
                            originalText: html,
                            language: 'en',
                            font: 'default',
                            style: {},
                            position: { x: 0, y: 0 },
                        });
                    }
                });
                break;
            }
            case 'text/plain': {
                // Treat as plain text, one line per entry
                const lines = file.fileContent
                    .toString()
                    .split('\n')
                    .filter((l) => l.trim());
                for (const line of lines) {
                    manifestEntries.push({
                        projectId: String(file.project.id),
                        branchId: String(file.branch.id),
                        fileId: String(file.id),
                        manifestEntryId: (0, uuid_1.v4)(),
                        originalText: line,
                        language: 'en',
                        font: 'default',
                        style: {},
                        position: { x: 0, y: 0 },
                    });
                }
                break;
            }
            case 'application/json': {
                // Parse JSON and extract all string values (recursively)
                function extractStrings(obj, out = []) {
                    if (typeof obj === 'string') {
                        out.push(obj);
                    }
                    else if (Array.isArray(obj)) {
                        for (const item of obj)
                            extractStrings(item, out);
                    }
                    else if (typeof obj === 'object' && obj !== null) {
                        for (const key in obj)
                            extractStrings(obj[key], out);
                    }
                    return out;
                }
                let jsonContent;
                try {
                    jsonContent = JSON.parse(file.fileContent.toString());
                }
                catch (e) {
                    console.log(e);
                    break;
                }
                const strings = extractStrings(jsonContent);
                for (const str of strings) {
                    if (str && str.trim()) {
                        manifestEntries.push({
                            projectId: String(file.project.id),
                            branchId: String(file.branch.id),
                            fileId: String(file.id),
                            manifestEntryId: (0, uuid_1.v4)(),
                            originalText: str,
                            language: 'en',
                            font: 'default',
                            style: {},
                            position: { x: 0, y: 0 },
                        });
                    }
                }
                break;
            }
            default: {
                // fallback plain text
                const lines = file.fileContent
                    .toString()
                    .split('\n')
                    .filter((l) => l.trim());
                for (const line of lines) {
                    manifestEntries.push({
                        projectId: String(file.project.id),
                        branchId: String(file.branch.id),
                        fileId: String(file.id),
                        manifestEntryId: (0, uuid_1.v4)(),
                        originalText: line,
                        language: 'en',
                        font: 'default',
                        style: {},
                        position: { x: 0, y: 0 },
                    });
                }
            }
        }
        // Chia part theo trang thay vì theo số lượng string cố định
        assignFilePartsByPage(manifestEntries);
        console.log(`[MANIFEST] Assigned file parts by page. Total entries: ${manifestEntries.length}`);
        // Trước khi insertMany, set obsolete: false cho từng manifestEntries
        for (const entry of manifestEntries) {
            entry.obsolete = false;
        }
        // Không insert duplicate: Nếu đã có string cũ (cùng fileId, originalText, language), chỉ update obsolete: false
        for (const entry of manifestEntries) {
            const existing = await this.translationModel.findOne({
                fileId: entry.fileId,
                originalText: entry.originalText,
                language: entry.language,
            });
            if (existing) {
                // Nếu đã có, chỉ update obsolete: false và filePart mới
                await this.translationModel.updateOne({ _id: existing._id }, {
                    $set: {
                        obsolete: false,
                        filePart: entry.filePart
                    }
                });
            }
            else {
                // Nếu chưa có, insert mới
                await this.translationModel.create(entry);
            }
        }
        // Không dùng insertMany nữa để tránh duplicate
    }
};
exports.ManifestService = ManifestService;
exports.ManifestService = ManifestService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, mongoose_1.InjectModel)(translation_schema_1.TranslationString.name)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object])
], ManifestService);
async function parsePdfWithFonts(buffer) {
    // Thiết lập worker cho pdfjs-dist
    pdfjs.GlobalWorkerOptions.workerSrc = path.resolve(__dirname, '../../../../../../node_modules/pdfjs-dist/build/pdf.worker.js');
    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    const numPages = doc.numPages;
    const allItems = [];
    let fullText = '';
    for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();
        fullText += textContent.items
            .filter((item) => 'str' in item)
            .map((item) => item.str)
            .join(' ');
        for (const item of textContent.items) {
            if (!('str' in item) || !item.str.trim())
                continue;
            const tx = item.transform;
            const x = tx[4];
            const y = viewport.height - tx[5];
            const height = item.height;
            const width = item.width;
            const fontName = item.fontName;
            // Heuristics đơn giản để xác định style từ font name
            const isBold = fontName.toLowerCase().includes('bold');
            const isItalic = fontName.toLowerCase().includes('italic');
            allItems.push({
                text: item.str,
                font: fontName,
                fontSize: height,
                bold: isBold,
                italic: isItalic,
                color: '#000000', // pdfjs-dist không dễ lấy màu, tạm set default
                x,
                y,
                width,
                height,
                page: i,
            });
        }
    }
    return { text: fullText, items: allItems };
}


/***/ }),
/* 100 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TranslationStringSchema = exports.TranslationString = void 0;
const tslib_1 = __webpack_require__(1);
const mongoose_1 = __webpack_require__(41);
let TranslationString = class TranslationString {
};
exports.TranslationString = TranslationString;
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    tslib_1.__metadata("design:type", String)
], TranslationString.prototype, "projectId", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    tslib_1.__metadata("design:type", String)
], TranslationString.prototype, "branchId", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    tslib_1.__metadata("design:type", String)
], TranslationString.prototype, "fileId", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    tslib_1.__metadata("design:type", String)
], TranslationString.prototype, "manifestEntryId", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    tslib_1.__metadata("design:type", String)
], TranslationString.prototype, "originalText", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)(),
    tslib_1.__metadata("design:type", String)
], TranslationString.prototype, "translatedText", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    tslib_1.__metadata("design:type", String)
], TranslationString.prototype, "language", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    tslib_1.__metadata("design:type", Number)
], TranslationString.prototype, "filePart", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)(),
    tslib_1.__metadata("design:type", String)
], TranslationString.prototype, "font", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    tslib_1.__metadata("design:type", typeof (_a = typeof Record !== "undefined" && Record) === "function" ? _a : Object)
], TranslationString.prototype, "style", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    tslib_1.__metadata("design:type", Object)
], TranslationString.prototype, "position", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    tslib_1.__metadata("design:type", Boolean)
], TranslationString.prototype, "obsolete", void 0);
exports.TranslationString = TranslationString = tslib_1.__decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], TranslationString);
exports.TranslationStringSchema = mongoose_1.SchemaFactory.createForClass(TranslationString);
exports.TranslationStringSchema.index({ manifestEntryId: 1 });
exports.TranslationStringSchema.index({ fileId: 1, language: 1, originalText: 1 });


/***/ }),
/* 101 */
/***/ ((module) => {

module.exports = require("form-data");

/***/ }),
/* 102 */
/***/ ((module) => {

module.exports = require("pdfjs-dist");

/***/ }),
/* 103 */
/***/ ((module) => {

module.exports = require("path");

/***/ }),
/* 104 */
/***/ ((module) => {

module.exports = require("mammoth");

/***/ }),
/* 105 */
/***/ ((module) => {

module.exports = require("cheerio");

/***/ }),
/* 106 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FeeService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(15);
const Entities_1 = __webpack_require__(16);
const DEFAULT_FEE_KEY = 'default_fee_percentage';
let FeeService = class FeeService {
    constructor(settingsRepo) {
        this.settingsRepo = settingsRepo;
    }
    async getDefaultFee() {
        const setting = await this.settingsRepo.findOne({ where: { key: DEFAULT_FEE_KEY } });
        return setting ? Number(setting.value) : 5.0; // fallback to 5% if not set
    }
    async setDefaultFee(feePercentage) {
        if (feePercentage < 0 || feePercentage > 100) {
            throw new Error('Fee must be between 0 and 100');
        }
        let setting = await this.settingsRepo.findOne({ where: { key: DEFAULT_FEE_KEY } });
        if (!setting) {
            setting = this.settingsRepo.create({ key: DEFAULT_FEE_KEY, value: feePercentage });
        }
        else {
            setting.value = feePercentage;
        }
        return this.settingsRepo.save(setting);
    }
};
exports.FeeService = FeeService;
exports.FeeService = FeeService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_1.InjectRepository)(Entities_1.SettingsEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object])
], FeeService);


/***/ }),
/* 107 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var FileService_1;
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FileService = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(10);
const common_1 = __webpack_require__(2);
const Entities_1 = __webpack_require__(16);
const typeorm_2 = __webpack_require__(15);
const github_manager_service_1 = __webpack_require__(92);
const manifest_service_1 = __webpack_require__(99);
const mongoose_1 = __webpack_require__(41);
const translation_schema_1 = __webpack_require__(100);
const mongoose_2 = __webpack_require__(42);
const Entities_2 = __webpack_require__(16);
let FileService = FileService_1 = class FileService {
    constructor(fileRepository, translationModel, requestRepository, githubService, manifestService, commitRepository) {
        this.fileRepository = fileRepository;
        this.translationModel = translationModel;
        this.requestRepository = requestRepository;
        this.githubService = githubService;
        this.manifestService = manifestService;
        this.commitRepository = commitRepository;
        this.logger = new common_1.Logger(FileService_1.name);
        this.logger = new common_1.Logger(FileService_1.name);
        this.logger.log('FileService initialized');
    }
    async saveFile(params) {
        this.logger.log('===DEBUG FILE NAME saveFile===');
        const { uid, fileName, fileType, fileContent, projectId, branchId, requestId, } = params;
        const file = this.fileRepository.create({
            fileName,
            fileType,
            fileContent,
            uploader: { id: uid },
            project: projectId ? { id: projectId } : undefined,
            branch: branchId ? { id: branchId } : undefined,
            request: requestId ? { id: requestId } : undefined,
        });
        this.logger.log(`Saving file: ${fileName}, type: ${fileType}, projectId: ${projectId}, branchId: ${branchId}, uploader: ${uid}`);
        this.logger.log(`File content length: ${fileContent.length}`);
        this.logger.log(`Raw fileName: ${fileName}`);
        this.logger.log(`fileName (JSON): ${JSON.stringify(fileName)}`);
        this.logger.log(`fileName (Buffer): ${Buffer.from(fileName, 'utf8').toString('hex')}`);
        const savedFile = await this.fileRepository.save(file);
        const safeFileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
        const timestamped = `${Date.now()}_${safeFileName}`;
        const repoName = `project-${projectId}`;
        try {
            await this.githubService.pushInitialFile({
                repo: repoName,
                path: safeFileName,
                content: fileContent,
                message: `Uploaded ${fileName}`,
            });
        }
        catch (err) {
            this.logger.error('pushInitialFile error:', err);
        }
        // this.logger.log(`Saved FileEntity: ${JSON.stringify(savedFile)}`); // XÓA hoặc comment dòng này để tránh lỗi BigInt
        this.logger.log(`Pushed file to repo: ${repoName}, path: ${timestamped}`);
        return {
            fileId: savedFile.id.toString(),
            fileName: savedFile.fileName,
            fileType: savedFile.fileType,
            createdAt: savedFile.createdAt,
            updatedAt: savedFile.updatedAt,
            uploaderId: savedFile.uploader?.id
                ? savedFile.uploader.id.toString()
                : undefined,
            projectId: savedFile.project?.id
                ? savedFile.project.id.toString()
                : undefined,
            branchId: savedFile.branch?.id
                ? savedFile.branch.id.toString()
                : undefined,
            requestId: savedFile.request?.id
                ? savedFile.request.id.toString()
                : undefined,
        };
    }
    async handleUpload(file, uid, projectId, branchId, requestId) {
        this.logger.log('===DEBUG FILE NAME handleUpload===');
        console.log(file.originalname);
        const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const existingFile = await this.fileRepository.findOne({
            where: {
                fileName,
                project: projectId ? { id: projectId } : undefined,
                branch: branchId ? { id: branchId } : undefined,
            },
            relations: ['project', 'branch'],
        });
        let saved;
        let isUpdate = false;
        if (existingFile) {
            // Update nội dung file cũ
            existingFile.fileContent = file.buffer;
            existingFile.fileType = file.mimetype;
            existingFile.uploader = { id: uid };
            existingFile.updatedAt = new Date();
            existingFile.status = 'processing';
            await this.fileRepository.save(existingFile);
            saved = {
                fileId: existingFile.id.toString(),
                fileName: existingFile.fileName,
                fileType: existingFile.fileType,
                createdAt: existingFile.createdAt,
                updatedAt: existingFile.updatedAt,
                uploaderId: existingFile.uploader?.id?.toString(),
                projectId: existingFile.project?.id?.toString(),
                branchId: existingFile.branch?.id?.toString(),
                requestId: existingFile.request?.id?.toString(),
            };
            isUpdate = true;
        }
        else {
            // Tạo file mới như cũ
            const fileEntity = this.fileRepository.create({
                fileName,
                fileType: file.mimetype,
                fileContent: file.buffer,
                uploader: { id: uid },
                project: projectId ? { id: projectId } : undefined,
                branch: branchId ? { id: branchId } : undefined,
                request: requestId ? { id: requestId } : undefined,
                status: 'processing',
            });
            const savedFile = await this.fileRepository.save(fileEntity);
            saved = {
                fileId: savedFile.id.toString(),
                fileName: savedFile.fileName,
                createdAt: savedFile.createdAt,
                updatedAt: savedFile.updatedAt,
                uploaderId: savedFile.uploader?.id?.toString(),
                projectId: savedFile.project?.id?.toString(),
                branchId: savedFile.branch?.id?.toString(),
                requestId: savedFile.request?.id?.toString(),
            };
        }
        // Chạy extract string ở background, trả về ngay cho client
        setTimeout(async () => {
            try {
                await this.extractStringsFromFile(saved.fileId, uid);
                // Cập nhật status file thành 'ready'
                const fileEntity = await this.fileRepository.findOne({
                    where: { id: BigInt(saved.fileId) },
                });
                if (fileEntity) {
                    fileEntity.status = 'ready';
                    await this.fileRepository.save(fileEntity);
                }
            }
            catch (err) {
                // Nếu lỗi, cập nhật status file thành 'error'
                const fileEntity = await this.fileRepository.findOne({
                    where: { id: BigInt(saved.fileId) },
                });
                if (fileEntity) {
                    fileEntity.status = 'error';
                    console.log(err);
                    await this.fileRepository.save(fileEntity);
                }
            }
        }, 100);
        // Trả về ngay, không chờ extract xong
        return {
            ...saved,
            updated: isUpdate,
            status: 'processing',
        };
    }
    async saveTempFile(file, uid) {
        const fileEntity = this.fileRepository.create({
            fileName: file.originalname,
            fileType: file.mimetype,
            fileContent: file.buffer,
            uploader: { id: uid },
            project: null,
            branch: null,
        });
        const saved = await this.fileRepository.save(fileEntity);
        return { fileId: saved.id.toString(), fileName: saved.fileName };
    }
    async getProjectFiles(projectId) {
        const files = await this.fileRepository.find({
            where: { project: { id: projectId } },
            relations: ['uploader'],
            select: ['id', 'fileName', 'fileType', 'createdAt', 'uploader', 'status'],
            order: { createdAt: 'DESC' },
        });
        return files.map((file) => ({
            fileId: file.id.toString(),
            fileName: file.fileName,
            fileType: file.fileType,
            createdAt: file.createdAt,
            status: file.status || 'ready',
            uploader: {
                uploaderId: file.uploader.id.toString(),
                username: file.uploader.username,
                fullName: file.uploader.fullName,
            },
        }));
    }
    async getFileById(fileId) {
        const file = await this.fileRepository.findOne({
            where: { id: BigInt(fileId) },
            select: [
                'id',
                'fileName',
                'fileType',
                'fileContent',
                'status',
                'extractLog',
            ],
        });
        if (!file)
            return null;
        return {
            fileId: file.id.toString(),
            fileName: file.fileName,
            fileType: file.fileType,
            fileContent: file.fileContent,
            status: file.status || 'ready',
            extractLog: file.extractLog || '',
        };
    }
    async uploadFileForRequest(file, uid, requestId) {
        const request = await this.requestRepository.findOne({
            where: { id: requestId },
        });
        if (!request)
            throw new common_1.NotFoundException('Request not found');
        const saved = await this.saveFile({
            uid,
            fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            fileType: file.mimetype,
            fileContent: file.buffer,
            requestId,
        });
        const fullFile = await this.fileRepository.findOneOrFail({
            where: { id: BigInt(saved.fileId) },
            relations: ['project', 'branch'],
            select: [
                'id',
                'fileName',
                'fileType',
                'fileContent',
                'project',
                'branch',
            ],
        });
        await this.manifestService.generateManifest(fullFile);
        // Push manifest to GitHub if project/branch info is present
        if (fullFile.project && fullFile.branch) {
            const manifestEntries = await this.translationModel
                .find({ fileId: fullFile.id.toString() })
                .lean();
            const manifestJson = JSON.stringify(manifestEntries, null, 2);
            try {
                await this.githubService.pushInitialFile({
                    repo: `project-${fullFile.project.id}`,
                    path: `${fullFile.id.toString()}_manifest.json`,
                    content: manifestJson,
                    message: `Add manifest for ${fullFile.fileName}`,
                    branch: 'main',
                });
                this.logger.log(`Manifest pushed to repo for fileId: ${fullFile.id}`);
            }
            catch (err) {
                this.logger.error('Error pushing manifest to GitHub', err);
            }
        }
        return {
            message: 'File uploaded and linked to request',
            fileId: saved.fileId,
        };
    }
    async deleteFile(fileId, userId) {
        const file = await this.fileRepository.findOne({
            where: { id: BigInt(fileId) },
            relations: ['uploader', 'project'],
        });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        this.logger.log(`Attempting to delete file: ${file.fileName} (ID: ${fileId})`);
        const hasAttachFiles = await this.checkUserAttachFilesPermission(userId, file.project?.id);
        if (!hasAttachFiles) {
            throw new common_1.ForbiddenException('You do not have permission (AttachFiles) to delete this file');
        }
        // Debug: Kiểm tra tất cả commit liên quan đến file này
        const allCommits = await this.commitRepository
            .createQueryBuilder('commit')
            .where('commit.filePath = :filePath', { filePath: file.fileName })
            .getMany();
        this.logger.log(`Found ${allCommits.length} commits for file: ${file.fileName}`);
        allCommits.forEach((commit) => {
            this.logger.log(`Commit ID: ${commit.id}, Message: "${commit.message}", FilePath: "${commit.filePath}"`);
        });
        // Tạm thời bypass kiểm tra commit để test
        this.logger.log('Bypassing commit check for testing...');
        /*
        // Kiểm tra commit liên quan đến file (filePath trùng tên file) - loại trừ Initial commit
        const hasCommit = await this.commitRepository
          .createQueryBuilder('commit')
          .where('commit.filePath = :filePath', { filePath: file.fileName })
          .andWhere('commit.message NOT LIKE :message', { message: '%Initial%' })
          .getCount();
    
        this.logger.log(`Commits excluding Initial commit: ${hasCommit}`);
    
        if (hasCommit > 0) {
          throw new BadRequestException(
            'Cannot delete file: There are commits related to this file.'
          );
        }
        */
        await this.fileRepository.delete(String(file.id));
        this.logger.log(`File deleted successfully: ${file.fileName}`);
        return { success: true, message: 'File deleted' };
    }
    async checkUserAttachFilesPermission(userId, projectId) {
        console.log(userId, projectId);
        return true;
    }
    async extractStringsFromFile(fileId, userId) {
        const file = await this.fileRepository.findOne({
            where: { id: BigInt(fileId) },
            relations: ['uploader', 'project', 'branch'],
        });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        // Check permission - chỉ uploader mới có thể extract strings
        if (file.uploader.id.toString() !== userId.toString()) {
            throw new Error('You do not have permission to extract strings from this file');
        }
        let log = '';
        function appendLog(msg) {
            log += `[${new Date().toISOString()}] ${msg}\n`;
            if (file) {
                file.extractLog = log;
            }
        }
        try {
            appendLog('Start extracting strings...');
            // ĐÁNH DẤU OBSOLETE CHO STRING CŨ THAY VÌ XÓA CỨNG
            appendLog('Marking old strings as obsolete...');
            await this.translationModel.updateMany({ fileId: file.id.toString(), obsolete: { $ne: true } }, { $set: { obsolete: true } });
            appendLog('Generating manifest...');
            await this.manifestService.generateManifest(file);
            appendLog('Manifest generated.');
            // Optionally push manifest to GitHub if project/branch info is present
            if (file.project && file.branch) {
                appendLog('Pushing manifest to GitHub...');
                const manifestEntries = await this.translationModel
                    .find({ fileId: file.id.toString() })
                    .lean();
                const manifestJson = JSON.stringify(manifestEntries, null, 2);
                try {
                    await this.githubService.pushInitialFile({
                        repo: `project-${file.project.id}`,
                        path: `${file.id.toString()}_manifest.json`,
                        content: manifestJson,
                        message: `Add manifest for ${file.fileName}`,
                        branch: 'main',
                    });
                    appendLog('Manifest pushed to GitHub.');
                }
                catch (err) {
                    appendLog('Error pushing manifest to GitHub: ' + (err?.message || err));
                }
            }
            appendLog('Successfully generated manifest for file.');
            await this.fileRepository.save(file);
            return {
                success: true,
                message: 'Manifest generated successfully',
                fileId: file.id.toString(),
                fileName: file.fileName,
            };
        }
        catch (error) {
            appendLog('Error generating manifest: ' + (error?.message || error));
            await this.fileRepository.save(file);
            this.logger.error(`Error generating manifest for file ${file.fileName}:`, error);
            throw new Error(`Failed to generate manifest: `);
        }
    }
    async saveFileToDB(params) {
        const { uid, fileName, fileType, fileContent, projectId, branchId, requestId, } = params;
        const file = this.fileRepository.create({
            fileName,
            fileType,
            fileContent,
            uploader: { id: uid },
            project: projectId ? { id: projectId } : undefined,
            branch: branchId ? { id: branchId } : undefined,
            request: requestId ? { id: requestId } : undefined,
        });
        const savedFile = await this.fileRepository.save(file);
        return {
            fileId: savedFile.id.toString(),
            fileName: savedFile.fileName,
            fileType: savedFile.fileType,
            createdAt: savedFile.createdAt,
            updatedAt: savedFile.updatedAt,
            uploaderId: savedFile.uploader?.id?.toString(),
            projectId: savedFile.project?.id?.toString(),
            branchId: savedFile.branch?.id?.toString(),
            requestId: savedFile.request?.id?.toString(),
        };
    }
    async handleLocalUpload(file, uid, projectId, branchId, requestId) {
        this.logger.log('===DEBUG FILE NAME handleUpload===');
        const saved = await this.saveFileToDB({
            uid,
            fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            fileType: file.mimetype,
            fileContent: file.buffer,
            projectId,
            branchId,
            requestId,
        });
        // Find the full file entity with project/branch for manifest
        const fileEntity = await this.fileRepository.findOne({
            where: { id: BigInt(saved.fileId) },
            relations: ['project', 'branch'],
            select: [
                'id',
                'fileName',
                'fileType',
                'fileContent',
                'project',
                'branch',
            ],
        });
        if (fileEntity) {
            try {
                await this.manifestService.generateManifest(fileEntity);
            }
            catch (error) {
                this.logger.error(`Failed to generate manifest for file ${fileEntity.id}:`, error);
                // Continue execution even if manifest generation fails
            }
            // Optionally push manifest to GitHub if project/branch info is present
            if (fileEntity.project && fileEntity.branch) {
                const manifestEntries = await this.translationModel
                    .find({ fileId: fileEntity.id.toString() })
                    .lean();
                const manifestJson = JSON.stringify(manifestEntries, null, 2);
                try {
                    await this.githubService.pushInitialFile({
                        repo: `project-${fileEntity.project.id}`,
                        path: `${fileEntity.id.toString()}_manifest.json`,
                        content: manifestJson,
                        message: `Add manifest for ${fileEntity.fileName}`,
                        branch: 'main',
                    });
                    this.logger.log(`Manifest pushed to repo for fileId: ${fileEntity.id}`);
                }
                catch (err) {
                    this.logger.error('Error pushing manifest to GitHub', err);
                }
            }
        }
        this.logger.log(`File uploaded and saved. fileId: ${saved.fileId}`);
        return {
            message: 'File uploaded successfully',
            fileId: saved.fileId,
        };
    }
    async getFilePreview(fileId) {
        return fileId;
    }
};
exports.FileService = FileService;
exports.FileService = FileService = FileService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_1.InjectRepository)(Entities_1.FileEntity)),
    tslib_1.__param(1, (0, mongoose_1.InjectModel)(translation_schema_1.TranslationString.name)),
    tslib_1.__param(2, (0, typeorm_1.InjectRepository)(Entities_1.RequestEntity)),
    tslib_1.__param(5, (0, typeorm_1.InjectRepository)(Entities_2.CommitEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof github_manager_service_1.GitHubService !== "undefined" && github_manager_service_1.GitHubService) === "function" ? _d : Object, typeof (_e = typeof manifest_service_1.ManifestService !== "undefined" && manifest_service_1.ManifestService) === "function" ? _e : Object, typeof (_f = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _f : Object])
], FileService);


/***/ }),
/* 108 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CategoryController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const category_manager_service_1 = __webpack_require__(78);
const Dtos_1 = __webpack_require__(61);
const bigint_transform_pipe_1 = __webpack_require__(109);
const json_serializer_interceptor_1 = __webpack_require__(110);
let CategoryController = class CategoryController {
    constructor(categories) {
        this.categories = categories;
    }
    getCategories() {
        return this.categories.getCategories();
    }
    createCategory(newCategoryData) {
        return this.categories.createCategory(newCategoryData);
    }
    updateCategory(categoryId, categoryUpdateData) {
        return this.categories.updateCategory(categoryId, categoryUpdateData);
    }
    deleteCategory(categoryId) {
        return this.categories.deleteCategory(categoryId);
    }
};
exports.CategoryController = CategoryController;
tslib_1.__decorate([
    (0, common_1.Get)('all'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], CategoryController.prototype, "getCategories", null);
tslib_1.__decorate([
    (0, common_1.Post)('create'),
    tslib_1.__param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_b = typeof Dtos_1.CreateCategoryDto !== "undefined" && Dtos_1.CreateCategoryDto) === "function" ? _b : Object]),
    tslib_1.__metadata("design:returntype", void 0)
], CategoryController.prototype, "createCategory", null);
tslib_1.__decorate([
    (0, common_1.Put)(':id/update'),
    tslib_1.__param(0, (0, common_1.Param)('id', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_c = typeof Dtos_1.UpdateCategoryDto !== "undefined" && Dtos_1.UpdateCategoryDto) === "function" ? _c : Object]),
    tslib_1.__metadata("design:returntype", void 0)
], CategoryController.prototype, "updateCategory", null);
tslib_1.__decorate([
    (0, common_1.Delete)(':id/delete'),
    tslib_1.__param(0, (0, common_1.Param)('id', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt]),
    tslib_1.__metadata("design:returntype", void 0)
], CategoryController.prototype, "deleteCategory", null);
exports.CategoryController = CategoryController = tslib_1.__decorate([
    (0, common_1.Controller)('categories'),
    (0, common_1.UseInterceptors)(json_serializer_interceptor_1.JsonSerializerInterceptor),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof category_manager_service_1.CategoryManagerService !== "undefined" && category_manager_service_1.CategoryManagerService) === "function" ? _a : Object])
], CategoryController);


/***/ }),
/* 109 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BigIntTransformPipe = void 0;
const common_1 = __webpack_require__(2);
class BigIntTransformPipe {
    transform(value, metadata) {
        try {
            return BigInt(value);
        }
        catch (error) {
            throw new common_1.BadRequestException('Invalid bigint value');
        }
    }
}
exports.BigIntTransformPipe = BigIntTransformPipe;


/***/ }),
/* 110 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JsonSerializerInterceptor = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const rxjs_1 = __webpack_require__(111);
const bigint_utils_1 = __webpack_require__(65);
let JsonSerializerInterceptor = class JsonSerializerInterceptor {
    intercept(context, next) {
        return next.handle()
            .pipe((0, rxjs_1.map)(data => {
            if (data === null || data === undefined) {
                return JSON.stringify(data);
            }
            return (0, bigint_utils_1.JsonStringifyWithBigInt)(data);
        }));
    }
};
exports.JsonSerializerInterceptor = JsonSerializerInterceptor;
exports.JsonSerializerInterceptor = JsonSerializerInterceptor = tslib_1.__decorate([
    (0, common_1.Injectable)()
], JsonSerializerInterceptor);


/***/ }),
/* 111 */
/***/ ((module) => {

module.exports = require("rxjs");

/***/ }),
/* 112 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f, _g, _h;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const Dtos_1 = __webpack_require__(61);
const is_public_endpoint_decorator_1 = __webpack_require__(58);
const jwt_guard_1 = __webpack_require__(56);
const jwt_fallthrough_guard_1 = __webpack_require__(74);
const json_serializer_interceptor_1 = __webpack_require__(110);
const bigint_transform_pipe_1 = __webpack_require__(109);
const project_manager_service_1 = __webpack_require__(90);
const platform_express_1 = __webpack_require__(113);
const file_manager_service_1 = __webpack_require__(107);
let ProjectController = class ProjectController {
    constructor(projects, fileService) {
        this.projects = projects;
        this.fileService = fileService;
    }
    async create(projectData, req) {
        const result = await this.projects.createProject(req.user.id, projectData);
        console.log('ProjectController.create result:', result);
        return result;
    }
    async getMyProjects(req) {
        const userId = req.user.id;
        return this.projects.fetchAllUserProjects(userId);
    }
    async fetchProject(projectId, req) {
        return this.projects.fetchProject(req.user?.id, BigInt(projectId));
    }
    async update(projectId, projectUpdateData, req) {
        console.log(projectUpdateData);
        return this.projects.updateProjectMetadata(req.user.id, projectId, projectUpdateData);
    }
    async delete(projectId, req) {
        await this.projects.deleteProject(projectId, req.user.id);
        return { message: `Project with ID ${projectId} deleted successfully` };
    }
    async getAdminProjectsCount(req) {
        const count = await this.projects.getProjectsCount();
        return { count };
    }
    async searchUserToAdd(projectId, identifier, req) {
        if (!identifier?.trim()) {
            throw new common_1.BadRequestException('Identifier is required');
        }
        const users = await this.projects.findUserToProject(projectId, identifier.trim(), req.user.id);
        return { users };
    }
    async addUserToProject(projectId, userId, req) {
        try {
            const updatedProject = await this.projects.addUserToProject(projectId, userId, req.user.id);
            return {
                message: 'User added successfully',
                project: updatedProject,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(error);
        }
    }
    async removeUserFromProject(projectId, userId) {
        return this.projects.removeUserFromProject(projectId, userId);
    }
    async getAllMembers(projectId) {
        const { members, projectRoles } = await this.projects.getProjectMembersWithRoles(projectId);
        return { members, projectRoles };
    }
    async createBranch(projectId, req, body) {
        return this.projects.createBranch(projectId, req.user.id, body.displayName, body.fromBranchId);
    }
    async editBranch(projectId, branchId, req, body) {
        return this.projects.renameBranchName(branchId, req.user.id, projectId, body.newName);
    }
    async getBranches(projectId, req) {
        return this.projects.listBranchesForProject(projectId, req.user.id);
    }
    async getAllBranch(projectId, req) {
        return this.projects.listBranchesForProject(projectId, req.user.id);
    }
    async submitCommit(projectId, branchId, req, body) {
        return this.projects.submitCommit(projectId, req.user.id, branchId, body.filePath, body.content, body.message);
    }
    async reviewCommit(projectId, commitId, req, body) {
        return this.projects.reviewCommit(projectId, commitId, req.user.id, body.approve, body.reviewMessage);
    }
    async getCommitsFromGitHub(projectId, branchId) {
        return this.projects.listCommits(projectId, branchId);
    }
    async getLocalCommits(projectId, branchId) {
        return this.projects.getLocalCommits(projectId, branchId);
    }
    async uploadProjectFile(projectId, file, req) {
        try {
            console.log('File received at controller:', file);
            if (!file)
                throw new common_1.InternalServerErrorException('No file received at controller');
            const result = await this.fileService.handleUpload(file, req.user.id, projectId);
            console.log('Upload result:', result);
            return result;
        }
        catch (error) {
            console.error('Upload file error:', error);
            throw new common_1.InternalServerErrorException('Upload failed: ' + (error?.toString() || error));
        }
    }
};
exports.ProjectController = ProjectController;
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('create'),
    tslib_1.__param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_c = typeof Dtos_1.CreateProjectDto !== "undefined" && Dtos_1.CreateProjectDto) === "function" ? _c : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "create", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me/projects'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "getMyProjects", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_fallthrough_guard_1.JwtFallthroughGuard),
    (0, is_public_endpoint_decorator_1.IsPublicEndpoint)(),
    (0, common_1.Get)(':projectId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_d = typeof Partial !== "undefined" && Partial) === "function" ? _d : Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "fetchProject", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Patch)(':projectId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_e = typeof Dtos_1.UpdateProjectMetadataDto !== "undefined" && Dtos_1.UpdateProjectMetadataDto) === "function" ? _e : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "update", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':projectId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "delete", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('admin/count'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "getAdminProjectsCount", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':projectId/search-user'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)('identifier')),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, String, Object]),
    tslib_1.__metadata("design:returntype", typeof (_f = typeof Promise !== "undefined" && Promise) === "function" ? _f : Object)
], ProjectController.prototype, "searchUserToAdd", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':projectId/add-user'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)('userId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "addUserToProject", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':projectId/remove-user'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)('userId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "removeUserFromProject", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':projectId/members'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "getAllMembers", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':projectId/branches'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__param(2, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "createBranch", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Patch)(':projectId/:branchId/rename'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('branchId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__param(3, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "editBranch", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':projectId/branches'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "getBranches", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':projectId/getBranches'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "getAllBranch", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':projectId/:branchId/commit'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('branchId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__param(3, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "submitCommit", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':projectId/:commitId/review'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('commitId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__param(3, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "reviewCommit", null);
tslib_1.__decorate([
    (0, common_1.Get)(':projectId/:branchId/listCommit'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('branchId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "getCommitsFromGitHub", null);
tslib_1.__decorate([
    (0, common_1.Get)(':projectId/:branchId/local-commits'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('branchId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "getLocalCommits", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':projectId/files'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } })),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.UploadedFile)()),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_h = typeof Express !== "undefined" && (_g = Express.Multer) !== void 0 && _g.File) === "function" ? _h : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectController.prototype, "uploadProjectFile", null);
exports.ProjectController = ProjectController = tslib_1.__decorate([
    (0, common_1.Controller)('projects'),
    (0, common_1.UseInterceptors)(json_serializer_interceptor_1.JsonSerializerInterceptor),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof project_manager_service_1.ProjectManagerService !== "undefined" && project_manager_service_1.ProjectManagerService) === "function" ? _a : Object, typeof (_b = typeof file_manager_service_1.FileService !== "undefined" && file_manager_service_1.FileService) === "function" ? _b : Object])
], ProjectController);


/***/ }),
/* 113 */
/***/ ((module) => {

module.exports = require("@nestjs/platform-express");

/***/ }),
/* 114 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const Dtos_1 = __webpack_require__(61);
const decorators_1 = __webpack_require__(57);
const jwt_guard_1 = __webpack_require__(56);
const user_manager_service_1 = __webpack_require__(87);
const bigint_transform_pipe_1 = __webpack_require__(109);
const json_serializer_interceptor_1 = __webpack_require__(110);
const role_guard_1 = __webpack_require__(60);
const platform_express_1 = __webpack_require__(113);
const multer_1 = __webpack_require__(115);
const path_1 = __webpack_require__(103);
const path_2 = __webpack_require__(103);
let UserController = class UserController {
    constructor(users) {
        this.users = users;
    }
    register(dto) {
        return this.users.register(dto);
    }
    getProfile(request) {
        const result = this.users.getUserProfile(request.user.id);
        console.log('[GET PROFILE]', { userId: request.user.id, result });
        return result;
    }
    updateProfile(userUpdateData, request) {
        return this.users.updateProfile(request.user.id, userUpdateData);
    }
    async changePassword(request, dto) {
        await this.users.changePassword(request.user.id, dto);
    }
    async uploadAvatar(file, req) {
        const avatarUrl = `/uploads/avatars/${file.filename}`;
        console.log('[UPLOAD AVATAR]', { userId: req.user.id, avatarUrl, file });
        await this.users.updateAvatar(req.user.id, avatarUrl);
        return { avatarUrl };
    }
    async getAllUsers() {
        return this.users.getAllUsers();
    }
    async updateUserRole(userId, roleId, req) {
        return this.users.updateUserRole(userId, roleId, req);
    }
    async toggleUserStatus(userId) {
        return this.users.toggleUserStatus(userId);
    }
    async searchUser(identifier) {
        const users = await this.users.searchUsers(identifier);
        if (!users || users.length === 0) {
            throw new common_1.NotFoundException('User not found');
        }
        return users[0];
    }
};
exports.UserController = UserController;
tslib_1.__decorate([
    (0, decorators_1.IsPublicEndpoint)(),
    (0, common_1.Post)('register'),
    tslib_1.__param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_b = typeof Dtos_1.RegisterDto !== "undefined" && Dtos_1.RegisterDto) === "function" ? _b : Object]),
    tslib_1.__metadata("design:returntype", void 0)
], UserController.prototype, "register", null);
tslib_1.__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", void 0)
], UserController.prototype, "getProfile", null);
tslib_1.__decorate([
    (0, common_1.Put)('update'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_c = typeof Dtos_1.UpdateUserProfileDto !== "undefined" && Dtos_1.UpdateUserProfileDto) === "function" ? _c : Object, Object]),
    tslib_1.__metadata("design:returntype", void 0)
], UserController.prototype, "updateProfile", null);
tslib_1.__decorate([
    (0, common_1.Patch)('/change-password'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__param(1, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, typeof (_d = typeof Dtos_1.UpdateUserPasswordDto !== "undefined" && Dtos_1.UpdateUserPasswordDto) === "function" ? _d : Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "changePassword", null);
tslib_1.__decorate([
    (0, common_1.Post)('avatar'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('avatar', {
        storage: (0, multer_1.diskStorage)({
            destination: (0, path_2.join)(process.cwd(), 'apps/server/uploads/avatars'),
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, uniqueSuffix + (0, path_1.extname)(file.originalname));
            }
        }),
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
                cb(new Error('Only image files are allowed!'), false);
            }
            else {
                cb(null, true);
            }
        },
        limits: { fileSize: 2 * 1024 * 1024 },
    })),
    tslib_1.__param(0, (0, common_1.UploadedFile)()),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_f = typeof Express !== "undefined" && (_e = Express.Multer) !== void 0 && _e.File) === "function" ? _f : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "uploadAvatar", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, role_guard_1.RolesGuard),
    (0, common_1.Get)('admin/all'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "getAllUsers", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, role_guard_1.RolesGuard),
    (0, common_1.Put)('admin/:id/role/:rid'),
    tslib_1.__param(0, (0, common_1.Param)('id', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('rid')),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Number, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "updateUserRole", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, role_guard_1.RolesGuard),
    (0, common_1.Put)('admin/:id/toggle-status'),
    tslib_1.__param(0, (0, common_1.Param)('id', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "toggleUserStatus", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('search'),
    tslib_1.__param(0, (0, common_1.Query)('identifier')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], UserController.prototype, "searchUser", null);
exports.UserController = UserController = tslib_1.__decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseInterceptors)(json_serializer_interceptor_1.JsonSerializerInterceptor),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof user_manager_service_1.UserManagerService !== "undefined" && user_manager_service_1.UserManagerService) === "function" ? _a : Object])
], UserController);


/***/ }),
/* 115 */
/***/ ((module) => {

module.exports = require("multer");

/***/ }),
/* 116 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var GroupManagerService_1;
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GroupManagerService = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
const common_1 = __webpack_require__(2);
const typeorm_2 = __webpack_require__(10);
const common_2 = __webpack_require__(21);
const Entities_1 = __webpack_require__(16);
const project_manager_service_1 = __webpack_require__(90);
const common_http_service_impl_1 = __webpack_require__(91);
const notification_manager_service_1 = __webpack_require__(94);
let GroupManagerService = GroupManagerService_1 = class GroupManagerService extends common_http_service_impl_1.CommonHttpServiceImpl {
    constructor(projectGroupRepository, userRepository, projectRepository, projectManager, notificationService) {
        super();
        this.projectGroupRepository = projectGroupRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.projectManager = projectManager;
        this.notificationService = notificationService;
        this.logger = new common_1.Logger(GroupManagerService_1.name);
    }
    async createProjectGroup(uid, projectId, data) {
        await this.projectManager.testPermissions(projectId, uid, common_2.PermissionFlags.ManageGroups);
        const group = this.projectGroupRepository.create({
            project: { id: BigInt(projectId) },
            name: data.name,
        });
        try {
            const savedGroup = await this.projectGroupRepository.save(group);
            this.logger.debug(`Project group created successfully with ID: ${savedGroup.id}`);
            return savedGroup;
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to create project group');
        }
    }
    async fetchAllProjectGroups(uid, projectId) {
        await this.projectManager.testPermissions(projectId, uid, common_2.PermissionFlags.ViewProject);
        this.logger.debug(`Fetching all project groups for project [${projectId}]`);
        const groups = await this.projectGroupRepository.find({
            where: { project: { id: BigInt(projectId) } },
            relations: ['members'],
        });
        this.logger.debug(`[DEBUG] fetchAllProjectGroups: Số group: ${groups.length}`);
        groups.forEach((g) => {
            this.logger.debug(`[DEBUG] Group ${g.id} - ${g.name}: members = [${(g.members || []).map(m => m.id).join(', ')}]`);
        });
        if (!groups.length) {
            this.logger.debug(`No groups found for project [${projectId}]`);
            return [];
        }
        return groups;
    }
    async fetchProjectGroup(uid, projectId, groupId) {
        await this.projectManager.testPermissions(projectId, uid, common_2.PermissionFlags.ViewProject);
        this.logger.debug(`Fetching project groups for project [${projectId}]`, {
            groupId: groupId ?? 'All',
        });
        const query = this.projectGroupRepository
            .createQueryBuilder('group')
            .where('group.project = :projectId', { projectId })
            .select(['group.id', 'group.name', 'group.permissionFlags']);
        if (typeof groupId === 'bigint') {
            return await query.andWhere('group.id = :groupId', { groupId }).getOne();
        }
        return await query.getMany();
    }
    async updateProjectGroupMetadata(uid, projectId, groupId, updateData) {
        await this.projectManager.testPermissions(projectId, uid, common_2.PermissionFlags.ManageGroups);
        this.logger.debug(`Updating project group [${groupId}] for project [${projectId}]`, updateData);
        const group = await this.projectGroupRepository.findOne({
            where: { id: BigInt(groupId), project: { id: BigInt(projectId) } },
        });
        if (!group) {
            this.logger.debug(`Group [${groupId}] does not exist in project [${projectId}]`);
            throw new common_1.NotFoundException(`Unknown group`);
        }
        if (updateData.name) {
            group.name = updateData.name;
        }
        try {
            const updatedGroup = await this.projectGroupRepository.save(group);
            this.logger.debug(`Project group updated successfully with ID: ${updatedGroup.id}`);
            // Get group members to notify them about the update
            const groupWithMembers = await this.projectGroupRepository.findOne({
                where: { id: BigInt(groupId) },
                relations: ['members', 'project'],
            });
            if (groupWithMembers && groupWithMembers.members) {
                for (const member of groupWithMembers.members) {
                    await this.notificationService.createNotification({
                        userId: member.id,
                        type: 'GROUP_UPDATED',
                        message: `Group "${groupWithMembers.name}" in project "${groupWithMembers.project.name}" has been updated.`,
                        createdBy: uid,
                    });
                }
            }
            return updatedGroup;
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to update project group metadata');
        }
    }
    async deleteProjectGroup(uid, projectId, groupId) {
        await this.projectManager.testPermissions(projectId, uid, common_2.PermissionFlags.ManageGroups);
        this.logger.debug(`Deleting project group [${groupId}] for project [${projectId}]`);
        const group = await this.projectGroupRepository.findOne({
            where: { id: BigInt(groupId), project: { id: BigInt(projectId) } },
        });
        if (!group) {
            this.logger.debug(`Group [${groupId}] does not exist in project [${projectId}]`);
            throw new common_1.NotFoundException(`Unknown group`);
        }
        try {
            // Get group members before deletion to notify them
            const groupWithMembers = await this.projectGroupRepository.findOne({
                where: { id: BigInt(groupId) },
                relations: ['members', 'project'],
            });
            await this.projectGroupRepository.remove(group);
            this.logger.debug(`Project group deleted successfully with ID: ${group.id}`);
            // Notify group members about the deletion
            if (groupWithMembers && groupWithMembers.members) {
                for (const member of groupWithMembers.members) {
                    await this.notificationService.createNotification({
                        userId: member.id,
                        type: 'GROUP_DELETED',
                        message: `Group "${groupWithMembers.name}" in project "${groupWithMembers.project.name}" has been deleted.`,
                        createdBy: uid,
                    });
                }
            }
            return { message: `Project group deleted successfully` };
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to delete project group');
        }
    }
    async addUsersToGroup(uid, projectId, groupId, userIds) {
        await this.projectManager.testPermissions(projectId, uid, common_2.PermissionFlags.ManageMembers);
        this.logger.debug(`Adding users to group [${groupId}] in project [${projectId}]`, { userIds });
        const group = await this.projectGroupRepository.findOne({
            where: { id: BigInt(groupId), project: { id: BigInt(projectId) } },
        });
        if (!group) {
            this.logger.debug(`Group [${groupId}] does not exist in project [${projectId}]`);
            throw new common_1.NotFoundException(`Unknown group`);
        }
        const toAddSet = new Set(userIds.map((id) => BigInt(id)));
        const searchIds = Array.from(toAddSet);
        this.logger.debug(`[DEBUG] addUsersToGroup: Searching for users with IDs:`, searchIds);
        this.logger.debug(`[DEBUG] addUsersToGroup: Project ID:`, projectId);
        const usersToAdd = await this.userRepository.findBy({
            id: (0, typeorm_1.In)(searchIds),
            projects: { id: BigInt(projectId) },
        });
        this.logger.debug(`[DEBUG] addUsersToGroup: Found users:`, usersToAdd.map(u => ({ id: u.id, email: u.email })));
        this.logger.debug(`[DEBUG] addUsersToGroup: Expected count: ${toAddSet.size}, Found count: ${usersToAdd.length}`);
        if (usersToAdd.length !== toAddSet.size) {
            const missingIds = searchIds.filter((id) => !usersToAdd.some(u => u.id === id));
            this.logger.debug(`[DEBUG] addUsersToGroup: Missing user IDs:`, missingIds);
            // Kiểm tra xem có phải project owner không
            const project = await this.projectRepository.findOne({
                where: { id: BigInt(projectId) },
                relations: ['createdBy', 'members'],
            });
            if (project && project.createdBy) {
                const ownerId = project.createdBy.id;
                const missingOwner = missingIds.some(id => id === ownerId);
                if (missingOwner) {
                    // Thêm project owner vào members nếu chưa có
                    const owner = await this.userRepository.findOne({
                        where: { id: ownerId },
                    });
                    if (owner) {
                        project.members = project.members || [];
                        if (!project.members.some((m) => m.id === ownerId)) {
                            project.members.push(owner);
                            await this.projectRepository.save(project);
                            // Thử lại query
                            const updatedUsersToAdd = await this.userRepository.findBy({
                                id: (0, typeorm_1.In)(searchIds),
                                projects: { id: BigInt(projectId) },
                            });
                            if (updatedUsersToAdd.length === toAddSet.size) {
                                // Nếu bây giờ tìm thấy tất cả, sử dụng kết quả mới
                                usersToAdd.length = 0;
                                usersToAdd.push(...updatedUsersToAdd);
                            }
                            else {
                                // Nếu vẫn còn thiếu, throw error
                                const stillMissingIds = searchIds.filter(id => !updatedUsersToAdd.some((u) => u.id === id));
                                throw new common_1.BadRequestException({
                                    message: `Some users do not exist in the project`,
                                    data: stillMissingIds.map(id => id.toString()),
                                });
                            }
                        }
                    }
                }
            }
            // Nếu vẫn còn thiếu user khác
            if (usersToAdd.length !== toAddSet.size) {
                const stillMissingIds = searchIds.filter(id => !usersToAdd.some((u) => u.id === id));
                throw new common_1.BadRequestException({
                    message: `Some users do not exist in the project`,
                    data: stillMissingIds.map(id => id.toString()),
                });
            }
        }
        group.members = [...(group.members || []), ...usersToAdd];
        try {
            const updatedGroup = await this.projectGroupRepository.save(group);
            this.logger.debug(`Users added to group successfully`, { updatedGroup });
            // Get group and project info for notifications
            const groupWithProject = await this.projectGroupRepository.findOne({
                where: { id: BigInt(groupId) },
                relations: ['project'],
            });
            // Notify users that they were added to the group
            for (const user of usersToAdd) {
                await this.notificationService.createNotification({
                    userId: user.id,
                    type: 'ADDED_TO_GROUP',
                    message: `You have been added to group "${groupWithProject?.name}" in project "${groupWithProject?.project.name}".`,
                    createdBy: uid,
                });
            }
            return updatedGroup;
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to add users to group');
        }
    }
    async removeUsersFromGroup(uid, projectId, groupId, userIds) {
        await this.projectManager.testPermissions(projectId, uid, common_2.PermissionFlags.ManageGroups);
        this.logger.debug(`Removing users from group [${groupId}] in project [${projectId}]`, { userIds });
        const group = await this.projectGroupRepository.findOne({
            where: { id: BigInt(groupId), project: { id: BigInt(projectId) } },
            relations: ['members'],
        });
        if (!group) {
            throw new common_1.NotFoundException(`Unknown group`);
        }
        const toRemoveSet = new Set(userIds.map((id) => BigInt(id)));
        // Lọc ra những user không cần xóa
        group.members = (group.members || []).filter((member) => !toRemoveSet.has(member.id));
        try {
            const updatedGroup = await this.projectGroupRepository.save(group);
            this.logger.debug(`Users removed from group successfully`, {
                updatedGroup,
            });
            // Get group and project info for notifications
            const groupWithProject = await this.projectGroupRepository.findOne({
                where: { id: BigInt(groupId) },
                relations: ['project'],
            });
            // Get the users that were removed to notify them
            const removedUsers = await this.userRepository.findBy({
                id: (0, typeorm_1.In)(Array.from(toRemoveSet)),
            });
            // Notify users that they were removed from the group
            for (const user of removedUsers) {
                await this.notificationService.createNotification({
                    userId: user.id,
                    type: 'REMOVED_FROM_GROUP',
                    message: `You have been removed from group "${groupWithProject?.name}" in project "${groupWithProject?.project.name}".`,
                    createdBy: uid,
                });
            }
            return updatedGroup;
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to remove users from group');
        }
    }
    async setUsersForGroup(uid, projectId, groupId, userIds) {
        await this.projectManager.testPermissions(projectId, uid, common_2.PermissionFlags.ManageMembers);
        this.logger.debug(`[DEBUG] setUsersForGroup: Đặt lại toàn bộ thành viên cho group [${groupId}] trong project [${projectId}]`, { userIds });
        const group = await this.projectGroupRepository.findOne({
            where: { id: BigInt(groupId), project: { id: BigInt(projectId) } },
            relations: ['members'],
        });
        if (!group) {
            this.logger.debug(`Group [${groupId}] does not exist in project [${projectId}]`);
            throw new common_1.NotFoundException(`Unknown group`);
        }
        // Lấy danh sách user hợp lệ
        const numericUserIds = userIds.map(id => BigInt(id));
        const users = await this.userRepository.findBy({
            id: (0, typeorm_1.In)(numericUserIds),
            projects: { id: BigInt(projectId) },
        });
        // Nếu có user không tìm thấy, có thể là project owner chưa được thêm vào members
        if (users.length !== userIds.length) {
            const missingIds = userIds.filter(id => !users.some(u => u.id === BigInt(id)));
            // Kiểm tra xem có phải project owner không
            const project = await this.projectRepository.findOne({
                where: { id: BigInt(projectId) },
                relations: ['createdBy', 'members'],
            });
            if (project && project.createdBy) {
                const ownerId = project.createdBy.id;
                const missingOwner = missingIds.some(id => BigInt(id) === ownerId);
                if (missingOwner) {
                    // Thêm project owner vào members nếu chưa có
                    const owner = await this.userRepository.findOne({
                        where: { id: ownerId },
                    });
                    if (owner) {
                        project.members = project.members || [];
                        if (!project.members.some((m) => m.id === ownerId)) {
                            project.members.push(owner);
                            await this.projectRepository.save(project);
                            // Thử lại query
                            const updatedUsers = await this.userRepository.findBy({
                                id: (0, typeorm_1.In)(numericUserIds),
                                projects: { id: BigInt(projectId) },
                            });
                            if (updatedUsers.length === userIds.length) {
                                // Nếu bây giờ tìm thấy tất cả, sử dụng kết quả mới
                                users.length = 0;
                                users.push(...updatedUsers);
                            }
                            else {
                                // Nếu vẫn còn thiếu, throw error
                                const stillMissingIds = userIds.filter(id => !updatedUsers.some((u) => u.id === BigInt(id)));
                                throw new common_1.BadRequestException({
                                    message: 'Some users do not exist in the project',
                                    data: stillMissingIds.map(id => id.toString())
                                });
                            }
                        }
                    }
                }
            }
            // Nếu vẫn còn thiếu user khác
            if (users.length !== userIds.length) {
                const stillMissingIds = userIds.filter(id => !users.some((u) => u.id === BigInt(id)));
                throw new common_1.BadRequestException({
                    message: 'Some users do not exist in the project',
                    data: stillMissingIds.map(id => id.toString())
                });
            }
        }
        group.members = users;
        try {
            const updatedGroup = await this.projectGroupRepository.save(group);
            this.logger.debug(`[DEBUG] setUsersForGroup: Đã cập nhật group.members = [${users.map(u => u.id).join(', ')}]`);
            return updatedGroup;
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to set users for group');
        }
    }
};
exports.GroupManagerService = GroupManagerService;
exports.GroupManagerService = GroupManagerService = GroupManagerService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_2.InjectRepository)(Entities_1.ProjectGroupEntity)),
    tslib_1.__param(1, (0, typeorm_2.InjectRepository)(Entities_1.UserEntity)),
    tslib_1.__param(2, (0, typeorm_2.InjectRepository)(Entities_1.ProjectEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _c : Object, typeof (_d = typeof project_manager_service_1.ProjectManagerService !== "undefined" && project_manager_service_1.ProjectManagerService) === "function" ? _d : Object, typeof (_e = typeof notification_manager_service_1.NotificationManagerService !== "undefined" && notification_manager_service_1.NotificationManagerService) === "function" ? _e : Object])
], GroupManagerService);


/***/ }),
/* 117 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var DiscussionManagerService_1;
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DiscussionManagerService = void 0;
const tslib_1 = __webpack_require__(1);
const Entities_1 = __webpack_require__(16);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(15);
const common_http_service_impl_1 = __webpack_require__(91);
const common_2 = __webpack_require__(21);
const project_manager_service_1 = __webpack_require__(90);
let DiscussionManagerService = DiscussionManagerService_1 = class DiscussionManagerService extends common_http_service_impl_1.CommonHttpServiceImpl {
    constructor(discussionThreadRepository, projectRoleRepository, discussionCommentRepository, discussionAccessPolicyRepository, dataSource, projectManager) {
        super();
        this.discussionThreadRepository = discussionThreadRepository;
        this.projectRoleRepository = projectRoleRepository;
        this.discussionCommentRepository = discussionCommentRepository;
        this.discussionAccessPolicyRepository = discussionAccessPolicyRepository;
        this.dataSource = dataSource;
        this.projectManager = projectManager;
        this.logger = new common_1.Logger(DiscussionManagerService_1.name);
    }
    /**
     * Get the user's permissions for a specific discussion thread.
     * This method aggregates permissions from all roles the user has in the project,
     * including the 'Everyone' role, and applies any access policy overrides defined for the thread.
     * @param uid The user's ID. If empty it's equivalent to an anonymous user.
     * @param threadId The ID of the discussion thread to check permissions for.
     * @returns A `Permission` object representing the user's permissions for the thread.
     */
    async getUserPermissionForThread(uid, threadId) {
        // First, get the project ID for this thread
        const thread = await this.discussionThreadRepository.findOne({
            where: { id: threadId },
            select: ['project'],
            relations: ['project'],
        });
        if (!thread) {
            throw new common_1.NotFoundException('Thread not found');
        }
        const projectId = thread.project.id;
        // Get all user roles for this project
        const userRoles = await this.projectRoleRepository.find({
            where: {
                users: { id: uid },
                project: { id: projectId },
            },
            relations: ['users'],
        });
        // Get the Everyone role for this project
        const everyoneRole = await this.projectRoleRepository.findOne({
            where: {
                name: 'Everyone',
                project: { id: projectId }
            },
            select: ['id', 'permissionFlags'],
        });
        if (!everyoneRole) {
            throw new common_1.NotFoundException('Everyone role not found for this project');
        }
        // Add Everyone role to the list if user is not already in it
        const userHasEveryoneRole = userRoles.some(role => role.id === everyoneRole.id);
        if (!userHasEveryoneRole) {
            userRoles.unshift(everyoneRole);
        }
        let resultPermission = new common_2.Permission(common_2.PermissionFlags.None);
        for (const role of userRoles) {
            // Start with the role's base permissions
            let rolePermission = role.permissionFlags || new common_2.Permission(common_2.PermissionFlags.None);
            // Check for access policy overrides
            const overrides = await this.discussionAccessPolicyRepository.findOne({
                where: {
                    thread: { id: threadId },
                    role: { id: role.id },
                },
            });
            if (overrides) {
                // Apply overrides: add allowOverrides, remove denyOverrides
                rolePermission = rolePermission
                    .add(overrides.allowOverrides ?? common_2.PermissionFlags.None)
                    .remove(overrides.denyOverrides ?? common_2.PermissionFlags.None);
            }
            // Combine with overall result
            resultPermission = resultPermission.add(rolePermission);
        }
        // If user has ViewProject permission, they should also have ViewThread permission
        if (resultPermission.has(common_2.PermissionFlags.ViewProject)) {
            resultPermission = resultPermission.add(common_2.PermissionFlags.ViewThread);
        }
        return resultPermission;
    }
    async fetchDiscussion(uid, projectId, threadId) {
        const threadAccessPolicy = await this.discussionThreadRepository.findOne({
            where: { id: threadId, project: { id: projectId } },
            select: ['accessPolicies'],
            relations: ['accessPolicies'],
        });
        if (!threadAccessPolicy) {
            throw new common_1.NotFoundException('Unknown discussion thread');
        }
        const resultPermission = await this.getUserPermissionForThread(uid, threadId);
        if (!resultPermission.has(common_2.PermissionFlags.ViewThread)) {
            throw new common_1.ForbiddenException('You do not have permission to view this discussion');
        }
        return await this.discussionThreadRepository.findOne({
            where: { id: threadId, project: { id: projectId } },
            relations: [
                'comments',
                'comments.author',
                'comments.upvotes',
                'comments.downvotes',
            ],
            // Bỏ select để trả về đầy đủ thông tin author
        });
    }
    async fetchDiscussions(uid, projectId) {
        const threads = await this.discussionThreadRepository.find({
            where: { project: { id: projectId } },
            relations: ['comments'],
            select: ['id', 'title', 'description', 'isArchived'],
        });
        if (!threads || threads.length === 0) {
            return [];
        }
        try {
            return (await Promise.all(threads.map(async (thread) => {
                const commentsCount = await this.discussionCommentRepository.count({
                    where: { thread: { id: thread.id } },
                    relations: ['author', 'upvotes', 'downvotes'],
                });
                return Object.assign(thread, {
                    userPermission: await this.getUserPermissionForThread(uid, thread.id),
                    commentsCount,
                });
            }))).filter((thread) => thread.userPermission.has(common_2.PermissionFlags.ViewThread));
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to fetch discussions');
        }
    }
    async createDiscussion(uid, projectId, discussionData) {
        await this.projectManager.testPermissions(projectId, uid, common_2.PermissionFlags.ManageDiscussions);
        const { title, description } = discussionData;
        const discussion = this.discussionThreadRepository.create({
            project: { id: projectId },
            title,
            description,
        });
        await this.discussionThreadRepository.save(discussion);
        const everyoneRole = await this.projectRoleRepository.findOne({
            where: { name: 'Everyone', project: { id: projectId } },
        });
        if (!everyoneRole) {
            throw new common_1.NotFoundException('Everyone role not found for this project');
        }
        const existingPolicy = await this.discussionAccessPolicyRepository.findOne({
            where: {
                thread: { id: discussion.id },
                role: { id: everyoneRole.id },
            },
        });
        let accessPolicy;
        if (!existingPolicy) {
            accessPolicy = this.discussionAccessPolicyRepository.create({
                role: everyoneRole,
                thread: discussion,
                allowOverrides: new common_2.Permission(common_2.PermissionFlags.None),
                denyOverrides: new common_2.Permission(common_2.PermissionFlags.None),
            });
            await this.discussionAccessPolicyRepository.save(accessPolicy);
        }
        else {
            accessPolicy = existingPolicy;
        }
        discussion.accessPolicies = [accessPolicy];
        return discussion;
    }
    async updateDiscussionMetadata(uid, projectId, threadId, discussionUpdateData) {
        await this.projectManager.testPermissions(projectId, uid, common_2.PermissionFlags.ManageDiscussions);
        const { title, description, accessPolicyOverrides: accessPolicy, } = discussionUpdateData;
        const updateData = {};
        if (title)
            updateData.title = title;
        if (description)
            updateData.description = description;
        if (accessPolicy) {
            for (const policy of accessPolicy) {
                const existingPolicy = await this.discussionAccessPolicyRepository.findOne({
                    where: {
                        thread: { id: threadId },
                        role: { id: policy.roleId },
                    },
                });
                if (existingPolicy) {
                    await this.discussionAccessPolicyRepository.save({
                        id: existingPolicy.id,
                        allowOverrides: policy.allowOverrides,
                        denyOverrides: policy.denyOverrides,
                    });
                }
                else {
                    await this.discussionAccessPolicyRepository.save({
                        thread: { id: threadId },
                        role: { id: policy.roleId },
                        allowOverrides: policy.allowOverrides,
                        denyOverrides: policy.denyOverrides,
                    });
                }
            }
        }
        try {
            await this.discussionThreadRepository.update(String(threadId), updateData);
            return await this.discussionThreadRepository.findOne({ where: { id: threadId } });
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to update discussion metadata');
        }
    }
    async archiveDiscussion(uid, projectId, threadId) {
        const discussionExists = await this.discussionThreadRepository.exists({
            where: { id: threadId },
        });
        if (!discussionExists) {
            throw new common_1.NotFoundException('Unknown discussion thread');
        }
        await this.projectManager.testPermissions(projectId, uid, common_2.PermissionFlags.ManageDiscussions);
        const discussion = await this.discussionThreadRepository.findOne({
            where: { id: threadId },
            select: ['isArchived'],
        });
        if (!discussion) {
            throw new common_1.NotFoundException('Discussion not found');
        }
        // Toggle archive status
        const newArchiveStatus = !discussion.isArchived;
        try {
            await this.discussionThreadRepository.update(String(threadId), { isArchived: newArchiveStatus });
            return await this.discussionThreadRepository.findOne({ where: { id: threadId } });
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to archive discussion');
        }
    }
    async deleteDiscussion(uid, projectId, threadId) {
        const discussionExists = await this.discussionThreadRepository.exists({
            where: { id: threadId },
        });
        if (!discussionExists) {
            throw new common_1.NotFoundException('Unknown discussion thread');
        }
        await this.projectManager.testPermissions(projectId, uid, common_2.PermissionFlags.ManageDiscussions);
        try {
            await this.discussionThreadRepository.delete({ id: threadId });
            return { message: 'Discussion deleted successfully' };
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to delete discussion');
        }
    }
    async postComment(uid, threadId, commentData) {
        const { content } = commentData;
        const resultPermission = await this.getUserPermissionForThread(uid, threadId);
        if (!resultPermission.has(common_2.PermissionFlags.PostComment)) {
            throw new common_1.ForbiddenException('You do not have permission to post comments in this discussion');
        }
        const isArchived = await this.discussionThreadRepository.exists({
            where: { id: threadId, isArchived: true },
        });
        if (isArchived) {
            throw new common_1.ForbiddenException('Cannot post comments in an archived discussion');
        }
        const comment = this.discussionCommentRepository.create({
            thread: { id: threadId },
            content,
            author: { id: uid },
        });
        try {
            const savedComment = await this.discussionCommentRepository.save(comment);
            return await this.discussionCommentRepository.findOne({
                where: { id: savedComment.id },
                relations: ['author', 'upvotes', 'downvotes'], // ✅ Populate đầy đủ
            });
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to post comment');
        }
    }
    async updateDiscussionComment(uid, threadId, commentId, commentUpdateData) {
        const comment = await this.discussionCommentRepository.findOne({
            where: { id: commentId, thread: { id: threadId } },
            select: ['author'],
        });
        if (!comment) {
            throw new common_1.NotFoundException('Unknown comment');
        }
        const { content } = commentUpdateData;
        const resultPermission = await this.getUserPermissionForThread(uid, threadId);
        if (!resultPermission.has(common_2.PermissionFlags.PostComment)) {
            throw new common_1.ForbiddenException('You do not have permission to edit comments in this discussion');
        }
        if (comment.author.id !== uid) {
            throw new common_1.ForbiddenException('You are not the author of this comment');
        }
        const isArchived = await this.discussionThreadRepository.exists({
            where: { id: threadId, isArchived: true },
        });
        if (isArchived) {
            throw new common_1.BadRequestException('Cannot edit comments in an archived discussion');
        }
        return await this.discussionCommentRepository.save({
            id: commentId,
            content,
            isEdited: true,
        });
    }
    async deleteDiscussionComment(uid, threadId, commentId) {
        const commentExists = await this.discussionCommentRepository.exists({
            where: { id: commentId, thread: { id: threadId } },
        });
        if (!commentExists) {
            throw new common_1.NotFoundException('Unknown comment');
        }
        const resultPermission = await this.getUserPermissionForThread(uid, threadId);
        if (!resultPermission.has(common_2.PermissionFlags.ManageComments)) {
            throw new common_1.ForbiddenException('You do not have permission to delete comments in this discussion');
        }
        const isArchived = await this.discussionThreadRepository.exists({
            where: { id: threadId, isArchived: true },
        });
        if (isArchived) {
            throw new common_1.BadRequestException('Cannot delete comments in an archived discussion');
        }
        try {
            await this.discussionCommentRepository.delete({ id: commentId });
            return { message: 'Comment deleted successfully' };
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to delete comment');
        }
    }
    async upvoteDiscussionComment(uid, threadId, commentId) {
        const commentExists = await this.discussionCommentRepository.exists({
            where: { id: commentId, thread: { id: threadId } },
        });
        if (!commentExists) {
            throw new common_1.NotFoundException('Unknown comment');
        }
        const resultPermission = await this.getUserPermissionForThread(uid, threadId);
        if (!resultPermission.has(common_2.PermissionFlags.Vote)) {
            throw new common_1.ForbiddenException('You do not have permission to upvote comments in this discussion');
        }
        const isArchived = await this.discussionThreadRepository.exists({
            where: { id: threadId, isArchived: true },
        });
        if (isArchived) {
            throw new common_1.BadRequestException('Cannot upvote comments in an archived discussion');
        }
        const upvoted = await this.discussionCommentRepository.exists({
            where: { id: commentId, upvotes: { id: uid } },
            relations: ['upvotes'],
        });
        if (upvoted) {
            throw new common_1.BadRequestException('You have already upvoted this comment');
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const downvoted = await this.discussionCommentRepository.exists({
                where: { id: commentId, downvotes: { id: uid } },
                relations: ['downvotes'],
            });
            if (downvoted) {
                await queryRunner.manager
                    .createQueryBuilder()
                    .relation(Entities_1.ProjectDiscussionCommentEntity, 'downvotes')
                    .of(commentId)
                    .remove(uid);
            }
            await queryRunner.manager
                .createQueryBuilder()
                .relation(Entities_1.ProjectDiscussionCommentEntity, 'upvotes')
                .of(commentId)
                .add(uid);
            await queryRunner.commitTransaction();
            return { message: 'Comment upvoted successfully' };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            this.unknownErrorHanlder(error, 'Failed to upvote comment');
        }
        finally {
            await queryRunner.release();
        }
    }
    async downvoteDiscussionComment(uid, threadId, commentId) {
        const commentExists = await this.discussionCommentRepository.exists({
            where: { id: commentId, thread: { id: threadId } },
        });
        if (!commentExists) {
            throw new common_1.NotFoundException('Unknown comment');
        }
        const resultPermission = await this.getUserPermissionForThread(uid, threadId);
        if (!resultPermission.has(common_2.PermissionFlags.Vote)) {
            throw new common_1.ForbiddenException('You do not have permission to downvote comments in this discussion');
        }
        const isArchived = await this.discussionThreadRepository.exists({
            where: { id: threadId, isArchived: true },
        });
        if (isArchived) {
            throw new common_1.BadRequestException('Cannot downvote comments in an archived discussion');
        }
        const downvoted = await this.discussionCommentRepository.exists({
            where: { id: commentId, downvotes: { id: uid } },
            relations: ['downvotes'],
        });
        if (downvoted) {
            throw new common_1.BadRequestException('You have already downvoted this comment');
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const upvoted = await this.discussionCommentRepository.exists({
                where: { id: commentId, upvotes: { id: uid } },
                relations: ['upvotes'],
            });
            if (upvoted) {
                await queryRunner.manager
                    .createQueryBuilder()
                    .relation(Entities_1.ProjectDiscussionCommentEntity, 'upvotes')
                    .of(commentId)
                    .remove(uid);
            }
            await queryRunner.manager
                .createQueryBuilder()
                .relation(Entities_1.ProjectDiscussionCommentEntity, 'downvotes')
                .of(commentId)
                .add(uid);
            await queryRunner.commitTransaction();
            return { message: 'Comment downvoted successfully' };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            this.unknownErrorHanlder(error, 'Failed to downvote comment');
        }
        finally {
            await queryRunner.release();
        }
    }
};
exports.DiscussionManagerService = DiscussionManagerService;
exports.DiscussionManagerService = DiscussionManagerService = DiscussionManagerService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_1.InjectRepository)(Entities_1.ProjectDiscussionThreadEntity)),
    tslib_1.__param(1, (0, typeorm_1.InjectRepository)(Entities_1.ProjectRoleEntity)),
    tslib_1.__param(2, (0, typeorm_1.InjectRepository)(Entities_1.ProjectDiscussionCommentEntity)),
    tslib_1.__param(3, (0, typeorm_1.InjectRepository)(Entities_1.DiscussionAccessPolicyEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _d : Object, typeof (_e = typeof typeorm_2.DataSource !== "undefined" && typeorm_2.DataSource) === "function" ? _e : Object, typeof (_f = typeof project_manager_service_1.ProjectManagerService !== "undefined" && project_manager_service_1.ProjectManagerService) === "function" ? _f : Object])
], DiscussionManagerService);


/***/ }),
/* 118 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var ProjectRoleManagerService_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectRoleManagerService = void 0;
const tslib_1 = __webpack_require__(1);
const Entities_1 = __webpack_require__(16);
const common_1 = __webpack_require__(21);
const common_2 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(15);
const common_http_service_impl_1 = __webpack_require__(91);
const typeorm_2 = __webpack_require__(10);
const project_manager_service_1 = __webpack_require__(90);
let ProjectRoleManagerService = ProjectRoleManagerService_1 = class ProjectRoleManagerService extends common_http_service_impl_1.CommonHttpServiceImpl {
    constructor(projectRoleRepository, userRepository, projectManager) {
        super();
        this.projectRoleRepository = projectRoleRepository;
        this.userRepository = userRepository;
        this.projectManager = projectManager;
        this.logger = new common_2.Logger(ProjectRoleManagerService_1.name);
    }
    async fetchUsersInRole(uid, projectId, roleId) {
        this.logger.debug(`Fetching users for role [${roleId}] in project [${projectId}]`);
        await this.projectManager.testPermissions(projectId, uid, common_1.PermissionFlags.ViewProject);
        const roleExists = await this.projectRoleRepository.exists({
            where: { id: roleId },
        });
        if (!roleExists) {
            this.logger.debug(`Role [${roleId}] does not exist in project [${projectId}]`);
            throw new common_2.NotFoundException(`Unknown role`);
        }
        return await this.projectRoleRepository
            .createQueryBuilder('role')
            .where('role.id = :roleId', { roleId })
            .andWhere('role.project = :projectId', { projectId })
            .innerJoin('role.users', 'users')
            .select([
            'users.id AS id',
            'users.username AS username',
            'users.fullName AS fullName',
        ])
            .getRawMany();
    }
    async createProjectRole(uid, projectId, roleData) {
        this.logger.debug('Check PermissionFlags.ManageRoles:', common_1.PermissionFlags.ManageRoles);
        this.logger.debug('All PermissionFlags:', common_1.PermissionFlags);
        await this.projectManager.testPermissions(projectId, uid, common_1.PermissionFlags.ManageMembers);
        this.logger.debug(`Adding role to project [${projectId}] for user [${uid}]`, roleData);
        let permissionFlags = roleData.permissionFlags ?? common_1.PermissionFlags.None;
        const hasProjectAdmin = (BigInt(permissionFlags) & common_1.PermissionFlags.ProjectAdmin) ===
            common_1.PermissionFlags.ProjectAdmin;
        if (hasProjectAdmin) {
            const ALL_FLAGS = Object.entries(common_1.PermissionFlags)
                .filter(([key, value]) => typeof value === 'bigint' &&
                key !== 'None' &&
                key !== 'Owner' &&
                key !== 'DeleteProject' &&
                key !== 'RemoveOwner')
                .map(([_, value]) => value)
                .reduce((acc, value) => acc | value, BigInt(0));
            permissionFlags = ALL_FLAGS;
        }
        const newRole = this.projectRoleRepository.create({
            project: { id: BigInt(projectId) },
            name: roleData.name,
            permissionFlags: new common_1.Permission(permissionFlags),
        });
        try {
            const savedRole = await this.projectRoleRepository.save(newRole);
            this.logger.debug(`Role created successfully with ID: ${savedRole.id}`);
            return savedRole;
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to create project role');
        }
    }
    async fetchProjectRoles(uid, projectId, roleId) {
        this.logger.debug(`Fetching roles [${roleId ?? 'All'}] for project [${projectId}]`);
        // Phải có quyền ViewProject để xem roles
        await this.projectManager.testPermissions(projectId, uid, common_1.PermissionFlags.ViewProject);
        const query = this.projectRoleRepository
            .createQueryBuilder('role')
            .where('role.project = :projectId', { projectId })
            .select(['role.id', 'role.name', 'role.permissionFlags']);
        if (roleId) {
            this.logger.debug(`Fetching role with ID [${roleId}] for project [${projectId}]`);
            return await query.andWhere('role.id = :roleId', { roleId }).getOne();
        }
        return await query.getMany();
    }
    async updateProjectRole(uid, projectId, roleId, updateData) {
        this.logger.debug(`Updating role [${roleId}] for project [${projectId}]`, updateData);
        // Phải có quyền ManageRoles để sửa role
        await this.projectManager.testPermissions(projectId, uid, common_1.PermissionFlags.ManageRoles);
        const role = await this.projectRoleRepository.findOne({
            where: { id: BigInt(roleId), project: { id: BigInt(projectId) } },
        });
        if (!role) {
            this.logger.debug(`Role [${roleId}] does not exist in project [${projectId}]`);
            throw new common_2.NotFoundException(`Unknown role`);
        }
        if (updateData.name) {
            role.name = updateData.name;
        }
        if (updateData.permissionFlags) {
            let permissionFlags = updateData.permissionFlags;
            const hasProjectAdmin = (BigInt(permissionFlags) & common_1.PermissionFlags.ProjectAdmin) ===
                common_1.PermissionFlags.ProjectAdmin;
            if (hasProjectAdmin) {
                const ALL_FLAGS = Object.entries(common_1.PermissionFlags)
                    .filter(([key, value]) => typeof value === 'bigint' &&
                    key !== 'None' &&
                    key !== 'Owner' &&
                    key !== 'DeleteProject' &&
                    key !== 'RemoveOwner')
                    .map(([_, value]) => value)
                    .reduce((acc, value) => acc | value, BigInt(0));
                permissionFlags = ALL_FLAGS;
            }
            role.permissionFlags = new common_1.Permission(permissionFlags);
        }
        try {
            const updatedRole = await this.projectRoleRepository.save(role);
            this.logger.debug(`Role updated successfully with ID: ${updatedRole.id}`);
            return updatedRole;
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to update project role');
        }
    }
    async deleteProjectRole(uid, projectId, roleId) {
        // Phải có quyền ManageRoles để xóa role
        await this.projectManager.testPermissions(projectId, uid, common_1.PermissionFlags.ManageRoles);
        this.logger.debug(`Deleting role [${roleId}] for project [${projectId}]`);
        const role = await this.projectRoleRepository.findOne({
            where: { id: BigInt(roleId), project: { id: BigInt(projectId) } },
        });
        if (!role) {
            this.logger.debug(`Role [${roleId}] does not exist in project [${projectId}]`);
            throw new common_2.NotFoundException(`Unknown role`);
        }
        await this.projectRoleRepository.remove(role);
        this.logger.debug(`Role [${roleId}] deleted successfully`);
        return { message: `Role deleted successfully` };
    }
    async addUsersToRole(uid, projectId, roleId, userIds) {
        // Phải có quyền ManageMembers để xóa user khỏi role
        await this.projectManager.testPermissions(projectId, uid, common_1.PermissionFlags.ManageRoles);
        this.logger.debug(`Adding users to role [${roleId}] in project [${projectId}]`, { userIds });
        const role = await this.projectRoleRepository.findOne({
            where: { id: BigInt(roleId), project: { id: BigInt(projectId) } },
            relations: ['users'],
        });
        if (!role) {
            this.logger.debug(`Role [${roleId}] does not exist in project [${projectId}]`);
            throw new common_2.NotFoundException(`Unknown role`);
        }
        const toAddSet = new Set(userIds.map((id) => BigInt(id)));
        const searchIds = Array.from(toAddSet);
        const usersToAdd = await this.userRepository.findBy({
            id: (0, typeorm_1.In)(searchIds),
            projects: { id: BigInt(projectId) },
        });
        if (usersToAdd.length !== toAddSet.size) {
            const missingIds = searchIds.filter((id) => !usersToAdd.some((u) => u.id === id));
            throw new common_2.BadRequestException({
                message: `Some users do not exist in the project`,
                data: missingIds,
            });
        }
        // Chỉ thêm user vào mảng users của role, không tạo mới role!
        const existingUserIds = new Set(role.users.map((u) => u.id.toString()));
        for (const user of usersToAdd) {
            if (!existingUserIds.has(user.id.toString())) {
                role.users.push(user);
            }
        }
        try {
            const savedRole = await this.projectRoleRepository.save(role);
            this.logger.debug(`Users added to role successfully`, { savedRole });
            return savedRole;
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to add users to project role');
        }
    }
    async removeUsersFromRole(uid, projectId, roleId, userIds) {
        // Phải có quyền ManageMembers để thêm user vào role
        await this.projectManager.testPermissions(projectId, uid, common_1.PermissionFlags.ManageMembers);
        this.logger.debug(`Removing users from role [${roleId}] in project [${projectId}]`, { userIds });
        // Find the role with users relation
        const role = await this.projectRoleRepository.findOne({
            where: { id: BigInt(roleId), project: { id: BigInt(projectId) } },
            relations: ['users', 'project'],
        });
        if (!role) {
            this.logger.debug(`Role [${roleId}] does not exist in project [${projectId}]`);
            throw new common_2.NotFoundException(`Unknown role`);
        }
        const toRemoveSet = new Set(userIds.map((id) => BigInt(id)));
        try {
            // Delete the relationships directly from the join table
            await this.projectRoleRepository
                .createQueryBuilder()
                .delete()
                .from('user_project_roles')
                .where('roleId = :roleId', { roleId: role.id })
                .andWhere('userId IN (:...userIds)', {
                userIds: Array.from(toRemoveSet),
            })
                .execute();
            this.logger.debug(`Users removed from role successfully`);
            return { message: `Users removed from role successfully` };
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to remove users from project role');
        }
    }
    async fixEveryoneRolePermissions(projectId) {
        this.logger.debug(`Fixing Everyone role permissions for project [${projectId}]`);
        const everyoneRole = await this.projectRoleRepository.findOne({
            where: { project: { id: projectId }, name: 'Everyone' },
        });
        if (!everyoneRole) {
            this.logger.debug(`Everyone role not found for project [${projectId}]`);
            return;
        }
        // Fix permissions to only include ViewProject
        everyoneRole.permissionFlags = new common_1.Permission(BigInt(common_1.PermissionFlags.ViewProject));
        try {
            await this.projectRoleRepository.save(everyoneRole);
            this.logger.debug(`Everyone role permissions fixed for project [${projectId}]`);
        }
        catch (error) {
            this.unknownErrorHanlder(error, 'Failed to fix Everyone role permissions');
        }
    }
};
exports.ProjectRoleManagerService = ProjectRoleManagerService;
exports.ProjectRoleManagerService = ProjectRoleManagerService = ProjectRoleManagerService_1 = tslib_1.__decorate([
    (0, common_2.Injectable)(),
    tslib_1.__param(0, (0, typeorm_2.InjectRepository)(Entities_1.ProjectRoleEntity)),
    tslib_1.__param(1, (0, typeorm_2.InjectRepository)(Entities_1.UserEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_1.Repository !== "undefined" && typeorm_1.Repository) === "function" ? _b : Object, typeof (_c = typeof project_manager_service_1.ProjectManagerService !== "undefined" && project_manager_service_1.ProjectManagerService) === "function" ? _c : Object])
], ProjectRoleManagerService);


/***/ }),
/* 119 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RequestController = void 0;
const tslib_1 = __webpack_require__(1);
const jwt_guard_1 = __webpack_require__(56);
const Dtos_1 = __webpack_require__(61);
const common_1 = __webpack_require__(2);
const request_manager_service_1 = __webpack_require__(82);
const bigint_transform_pipe_1 = __webpack_require__(109);
const json_serializer_interceptor_1 = __webpack_require__(110);
const platform_express_1 = __webpack_require__(113);
const is_public_endpoint_decorator_1 = __webpack_require__(58);
let RequestController = class RequestController {
    constructor(requests) {
        this.requests = requests;
    }
    async createRequest(body, files, req) {
        return this.requests.createRequest(body, req.user.id, files);
    }
    async createPrivateRequest(body, files, req) {
        return this.requests.createPrivateRequest(body, req.user.id, files);
    }
    async getMyRequests(req) {
        return this.requests.getMyRequests(req.user.id);
    }
    async getAllRequests(req) {
        // If user is authenticated, pass their ID, otherwise pass a special value (0)
        // that won't match any real user ID
        const userId = req?.user?.id ? BigInt(req.user.id) : BigInt(0);
        return this.requests.fetchRequests(userId);
    }
    async getAllPrivateRequests(req) {
        return this.requests.fetchPrivateRequests(req.user.id);
    }
    async getMyRegisteredRequests(req) {
        return this.requests.getMyRegisteredRequests(req.user.id);
    }
    async debugRegistrations(req) {
        return this.requests.getMyRegisteredRequests(req.user.id);
    }
    async getPendingRequestsCount() {
        const count = await this.requests.getPendingRequestsCount();
        return { count };
    }
    async updateRequest(requestId, body, req) {
        return this.requests.updateRequest(req.user.id, requestId, body);
    }
    async cancelRequest(requestId, req) {
        return this.requests.cancelRequest(req.user.id, requestId);
    }
    async registerRequest(requestId, req) {
        return this.requests.registerForPublicRequest(requestId, Number(req.user.id));
    }
    async getRegistrants(requestId) {
        return this.requests.getRequestRegistrants(requestId);
    }
    async approveRegistrant(requestId, userId) {
        return this.requests.approveRegistrant(requestId, userId);
    }
    async searchUsers(keyword, req) {
        const uid = req.user.id;
        return this.requests.searchUsers(keyword, uid);
    }
    async getDetail(requestId, req) {
        return this.requests.fetchRequestDetails(BigInt(requestId), BigInt(req.user.id));
    }
    async acceptPrivateRequest(requestId, req) {
        return this.requests.acceptPrivateRequest(requestId, req.user.id);
    }
    async declinePrivateRequest(requestId) {
        return this.requests.declinePrivateRequest(requestId);
    }
};
exports.RequestController = RequestController;
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('create'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files')),
    tslib_1.__param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(1, (0, common_1.UploadedFiles)()),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_b = typeof Dtos_1.CreateRequestDto !== "undefined" && Dtos_1.CreateRequestDto) === "function" ? _b : Object, Array, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "createRequest", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('create/private'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files')),
    tslib_1.__param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(1, (0, common_1.UploadedFiles)()),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_c = typeof Dtos_1.CreateRequestDto !== "undefined" && Dtos_1.CreateRequestDto) === "function" ? _c : Object, Array, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "createPrivateRequest", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('myRequests'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "getMyRequests", null);
tslib_1.__decorate([
    (0, is_public_endpoint_decorator_1.IsPublicEndpoint)(),
    (0, common_1.Get)('all'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "getAllRequests", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('private'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "getAllPrivateRequests", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('myRegistrations'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "getMyRegisteredRequests", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('debug/registrations'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "debugRegistrations", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('pending/count'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "getPendingRequestsCount", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':requestId/update'),
    tslib_1.__param(0, (0, common_1.Param)('requestId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_d = typeof Dtos_1.UpdateRequestDto !== "undefined" && Dtos_1.UpdateRequestDto) === "function" ? _d : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "updateRequest", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':requestId/cancel'),
    tslib_1.__param(0, (0, common_1.Param)('requestId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "cancelRequest", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':requestId/register'),
    tslib_1.__param(0, (0, common_1.Param)('requestId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "registerRequest", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':requestId/registrants'),
    tslib_1.__param(0, (0, common_1.Param)('requestId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "getRegistrants", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':requestId/approve/:userId'),
    tslib_1.__param(0, (0, common_1.Param)('requestId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('userId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Number]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "approveRegistrant", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('search'),
    tslib_1.__param(0, (0, common_1.Query)('keyword')),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "searchUsers", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':requestId/detail'),
    tslib_1.__param(0, (0, common_1.Param)('requestId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "getDetail", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':requestId/private'),
    tslib_1.__param(0, (0, common_1.Param)('requestId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "acceptPrivateRequest", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':requestId/decline'),
    tslib_1.__param(0, (0, common_1.Param)('requestId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt]),
    tslib_1.__metadata("design:returntype", Promise)
], RequestController.prototype, "declinePrivateRequest", null);
exports.RequestController = RequestController = tslib_1.__decorate([
    (0, common_1.Controller)('requests'),
    (0, common_1.UseInterceptors)(json_serializer_interceptor_1.JsonSerializerInterceptor),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof request_manager_service_1.RequestManagerService !== "undefined" && request_manager_service_1.RequestManagerService) === "function" ? _a : Object])
], RequestController);


/***/ }),
/* 120 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PermissionsController = exports.ProjectRoleController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const jwt_guard_1 = __webpack_require__(56);
const bigint_transform_pipe_1 = __webpack_require__(109);
const Dtos_1 = __webpack_require__(61);
const project_role_manager_service_1 = __webpack_require__(118);
const project_manager_service_1 = __webpack_require__(90);
const json_serializer_interceptor_1 = __webpack_require__(110);
const common_2 = __webpack_require__(21);
let ProjectRoleController = class ProjectRoleController {
    constructor(roles, projectManager) {
        this.roles = roles;
        this.projectManager = projectManager;
    }
    async fetchAllRoles(projectId, req) {
        return this.roles.fetchProjectRoles(req.user.id, projectId);
    }
    async fetchRoleMetadata(projectId, roleId, req) {
        return this.roles.fetchProjectRoles(req.user.id, projectId, roleId);
    }
    async fetchUsersInRole(projectId, roleId, req) {
        return this.roles.fetchUsersInRole(req.user.id, projectId, roleId);
    }
    async createRole(projectId, roleData, req) {
        return this.roles.createProjectRole(req.user.id, projectId, roleData);
    }
    async updateRole(projectId, roleId, roleUpdateData, req) {
        return this.roles.updateProjectRole(req.user.id, projectId, roleId, roleUpdateData);
    }
    async deleteRole(projectId, roleId, req) {
        return this.roles.deleteProjectRole(req.user.id, projectId, roleId);
    }
    async addUsersToRole(projectId, roleId, userIds, req) {
        return this.roles.addUsersToRole(req.user.id, projectId, roleId, userIds.userIds);
    }
    async removeUsersFromRole(projectId, roleId, userIds, req) {
        return this.roles.removeUsersFromRole(req.user.id, projectId, roleId, userIds.userIds);
    }
    async fixEveryoneRole(projectId, req) {
        // Only project owner or admin can fix roles
        await this.projectManager.testPermissions(projectId, req.user.id, common_2.PermissionFlags.ProjectAdmin);
        await this.roles.fixEveryoneRolePermissions(projectId);
        return { message: 'Everyone role permissions fixed successfully' };
    }
};
exports.ProjectRoleController = ProjectRoleController;
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectRoleController.prototype, "fetchAllRoles", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('/:roleId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('roleId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectRoleController.prototype, "fetchRoleMetadata", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('/:roleId/users'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('roleId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectRoleController.prototype, "fetchUsersInRole", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('/create'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_c = typeof Dtos_1.CreateProjectRoleDto !== "undefined" && Dtos_1.CreateProjectRoleDto) === "function" ? _c : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectRoleController.prototype, "createRole", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('/:roleId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('roleId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(3, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, typeof (_d = typeof Dtos_1.UpdateProjectRoleDto !== "undefined" && Dtos_1.UpdateProjectRoleDto) === "function" ? _d : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectRoleController.prototype, "updateRole", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('/:roleId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('roleId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectRoleController.prototype, "deleteRole", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('/:roleId/users/add'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('roleId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(3, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, typeof (_e = typeof Dtos_1.UserIdsArray !== "undefined" && Dtos_1.UserIdsArray) === "function" ? _e : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectRoleController.prototype, "addUsersToRole", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('/:roleId/users/remove'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('roleId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(3, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, typeof (_f = typeof Dtos_1.UserIdsArray !== "undefined" && Dtos_1.UserIdsArray) === "function" ? _f : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectRoleController.prototype, "removeUsersFromRole", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('/fix-everyone-role'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectRoleController.prototype, "fixEveryoneRole", null);
exports.ProjectRoleController = ProjectRoleController = tslib_1.__decorate([
    (0, common_1.Controller)('projects/:projectId/roles'),
    (0, common_1.UseInterceptors)(json_serializer_interceptor_1.JsonSerializerInterceptor),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof project_role_manager_service_1.ProjectRoleManagerService !== "undefined" && project_role_manager_service_1.ProjectRoleManagerService) === "function" ? _a : Object, typeof (_b = typeof project_manager_service_1.ProjectManagerService !== "undefined" && project_manager_service_1.ProjectManagerService) === "function" ? _b : Object])
], ProjectRoleController);
// Controller mới cho permissions
let PermissionsController = class PermissionsController {
    async getAvailablePermissions() {
        const permissions = Object.entries(common_2.PermissionFlags)
            .filter(([key, value]) => key !== 'None' && key !== 'Owner' && typeof value === 'bigint')
            .map(([key, value]) => ({
            value: key,
            label: key.replace(/([A-Z])/g, ' $1').trim(),
            description: this.getPermissionDescription(key)
        }));
        return permissions;
    }
    getPermissionDescription(permission) {
        const descriptions = {
            'ProjectAdmin': 'Quản trị dự án - tất cả quyền',
            'ManageMembers': 'Quản lý thành viên - thêm/xóa/đổi vai trò',
            'ManageBranches': 'Quản lý nhánh dự án',
            'ManageRoles': 'Quản lý vai trò trong dự án',
            'ManageWorkspaces': 'Quản lý workspace',
            'ManageGroups': 'Quản lý nhóm dự án',
            'ManageProjectMetadata': 'Quản lý thông tin dự án',
            'ManageDiscussions': 'Quản lý thảo luận',
            'ViewAudit': 'Xem nhật ký audit',
            'ReviewCommit': 'Duyệt commit trong workspace',
            'PushCommit': 'Đẩy commit vào workspace',
            'ReviewRequests': 'Duyệt request trong workspace',
            'ViewRequest': 'Xem request trong workspace',
            'ManageWorkspaceMetadata': 'Quản lý thông tin workspace',
            'ViewWorkspace': 'Xem workspace',
            'ManageComments': 'Quản lý bình luận trong thảo luận',
            'PostComment': 'Đăng bình luận',
            'Vote': 'Bình chọn trong thảo luận',
            'AttachFiles': 'Đính kèm file trong thảo luận',
            'ViewThread': 'Xem thảo luận',
            'ViewProject': 'Xem thông tin dự án'
        };
        return descriptions[permission] || permission;
    }
};
exports.PermissionsController = PermissionsController;
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], PermissionsController.prototype, "getAvailablePermissions", null);
exports.PermissionsController = PermissionsController = tslib_1.__decorate([
    (0, common_1.Controller)('permissions')
], PermissionsController);


/***/ }),
/* 121 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DiscussionController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const jwt_fallthrough_guard_1 = __webpack_require__(74);
const decorators_1 = __webpack_require__(57);
const bigint_transform_pipe_1 = __webpack_require__(109);
const jwt_guard_1 = __webpack_require__(56);
const Dtos_1 = __webpack_require__(61);
const discussion_manager_service_1 = __webpack_require__(117);
const json_serializer_interceptor_1 = __webpack_require__(110);
let DiscussionController = class DiscussionController {
    constructor(discussions) {
        this.discussions = discussions;
    }
    async fetchProjectDiscussions(projectId, req) {
        return this.discussions.fetchDiscussions(req.user?.id, projectId);
    }
    async createDiscussion(projectId, discussionData, req) {
        return this.discussions.createDiscussion(req.user.id, projectId, discussionData);
    }
    async updateDiscussionMetadata(projectId, threadId, discussionUpdateData, req) {
        return this.discussions.updateDiscussionMetadata(req.user.id, projectId, threadId, discussionUpdateData);
    }
    async archiveDiscussion(projectId, threadId, req) {
        return this.discussions.archiveDiscussion(req.user.id, projectId, threadId);
    }
    async deleteDiscussion(projectId, threadId, req) {
        return this.discussions.deleteDiscussion(req.user.id, projectId, threadId);
    }
    async fetchDiscussionThread(projectId, threadId, req) {
        // TODO: Some threads can be publicly accessed without authentication
        return this.discussions.fetchDiscussion(req.user?.id, projectId, threadId);
    }
    async postDiscussionComment(threadId, commentData, req) {
        return this.discussions.postComment(req.user.id, threadId, commentData);
    }
    async updateDiscussionComment(threadId, commentId, commentUpdateData, req) {
        return this.discussions.updateDiscussionComment(req.user.id, threadId, commentId, commentUpdateData);
    }
    async deleteDiscussionComment(threadId, commentId, req) {
        return this.discussions.deleteDiscussionComment(req.user.id, threadId, commentId);
    }
    async upvoteDiscussionComment(threadId, commentId, req) {
        return this.discussions.upvoteDiscussionComment(req.user.id, threadId, commentId);
    }
    async downvoteDiscussionComment(threadId, commentId, req) {
        return this.discussions.downvoteDiscussionComment(req.user.id, threadId, commentId);
    }
};
exports.DiscussionController = DiscussionController;
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_fallthrough_guard_1.JwtFallthroughGuard),
    (0, decorators_1.IsPublicEndpoint)(),
    (0, common_1.Get)(),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_b = typeof Partial !== "undefined" && Partial) === "function" ? _b : Object]),
    tslib_1.__metadata("design:returntype", Promise)
], DiscussionController.prototype, "fetchProjectDiscussions", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('create'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_c = typeof Dtos_1.CreateDiscussionDto !== "undefined" && Dtos_1.CreateDiscussionDto) === "function" ? _c : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], DiscussionController.prototype, "createDiscussion", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Patch)(':threadId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('threadId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(3, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, typeof (_d = typeof Dtos_1.UpdateDiscussionDto !== "undefined" && Dtos_1.UpdateDiscussionDto) === "function" ? _d : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], DiscussionController.prototype, "updateDiscussionMetadata", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':threadId/archive'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('threadId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], DiscussionController.prototype, "archiveDiscussion", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':threadId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('threadId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], DiscussionController.prototype, "deleteDiscussion", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_fallthrough_guard_1.JwtFallthroughGuard),
    (0, decorators_1.IsPublicEndpoint)(),
    (0, common_1.Get)(':threadId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('threadId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, typeof (_e = typeof Partial !== "undefined" && Partial) === "function" ? _e : Object]),
    tslib_1.__metadata("design:returntype", Promise)
], DiscussionController.prototype, "fetchDiscussionThread", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':threadId/post'),
    tslib_1.__param(0, (0, common_1.Param)('threadId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_f = typeof Dtos_1.PostCommentDto !== "undefined" && Dtos_1.PostCommentDto) === "function" ? _f : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], DiscussionController.prototype, "postDiscussionComment", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Patch)(':threadId/:commentId'),
    tslib_1.__param(0, (0, common_1.Param)('threadId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('commentId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(3, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, typeof (_g = typeof Dtos_1.UpdateCommentDto !== "undefined" && Dtos_1.UpdateCommentDto) === "function" ? _g : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], DiscussionController.prototype, "updateDiscussionComment", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':threadId/:commentId'),
    tslib_1.__param(0, (0, common_1.Param)('threadId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('commentId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], DiscussionController.prototype, "deleteDiscussionComment", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':threadId/:commentId/upvote'),
    tslib_1.__param(0, (0, common_1.Param)('threadId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('commentId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], DiscussionController.prototype, "upvoteDiscussionComment", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':threadId/:commentId/downvote'),
    tslib_1.__param(0, (0, common_1.Param)('threadId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('commentId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], DiscussionController.prototype, "downvoteDiscussionComment", null);
exports.DiscussionController = DiscussionController = tslib_1.__decorate([
    (0, common_1.Controller)('projects/:projectId/discussions'),
    (0, common_1.UseInterceptors)(json_serializer_interceptor_1.JsonSerializerInterceptor),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof discussion_manager_service_1.DiscussionManagerService !== "undefined" && discussion_manager_service_1.DiscussionManagerService) === "function" ? _a : Object])
], DiscussionController);


/***/ }),
/* 122 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GroupController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const group_manager_service_1 = __webpack_require__(116);
const jwt_guard_1 = __webpack_require__(56);
const bigint_transform_pipe_1 = __webpack_require__(109);
const Dtos_1 = __webpack_require__(61);
const json_serializer_interceptor_1 = __webpack_require__(110);
let GroupController = class GroupController {
    constructor(groups) {
        this.groups = groups;
    }
    async fetchAllGroups(projectId, req) {
        return this.groups.fetchAllProjectGroups(req.user.id, projectId);
    }
    async fetchGroupMetadata(projectId, groupId, req) {
        return this.groups.fetchProjectGroup(req.user.id, projectId, groupId);
    }
    async createGroup(projectId, groupData, req) {
        return this.groups.createProjectGroup(req.user.id, projectId, groupData);
    }
    async updateGroup(projectId, groupId, groupUpdateData, req) {
        return this.groups.updateProjectGroupMetadata(req.user.id, projectId, groupId, groupUpdateData);
    }
    async deleteGroup(projectId, groupId, req) {
        return this.groups.deleteProjectGroup(req.user.id, projectId, groupId);
    }
    async addUsersToGroup(projectId, groupId, userIds, req) {
        return this.groups.addUsersToGroup(req.user.id, projectId, groupId, userIds.userIds);
    }
    async removeUsersFromGroup(projectId, groupId, userIds, req) {
        return this.groups.removeUsersFromGroup(req.user.id, projectId, groupId, userIds.userIds);
    }
    async setUsersForGroup(projectId, groupId, userIds, req) {
        return this.groups.setUsersForGroup(req.user.id, projectId, groupId, userIds.userIds);
    }
};
exports.GroupController = GroupController;
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], GroupController.prototype, "fetchAllGroups", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':groupId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('groupId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], GroupController.prototype, "fetchGroupMetadata", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('create'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_b = typeof Dtos_1.CreateProjectGroupDto !== "undefined" && Dtos_1.CreateProjectGroupDto) === "function" ? _b : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], GroupController.prototype, "createGroup", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Patch)(':groupId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('groupId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(3, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, typeof (_c = typeof Dtos_1.CreateProjectGroupDto !== "undefined" && Dtos_1.CreateProjectGroupDto) === "function" ? _c : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], GroupController.prototype, "updateGroup", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':groupId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('groupId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], GroupController.prototype, "deleteGroup", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':groupId/users/add'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('groupId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(3, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, typeof (_d = typeof Dtos_1.UserIdsArray !== "undefined" && Dtos_1.UserIdsArray) === "function" ? _d : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], GroupController.prototype, "addUsersToGroup", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':groupId/users/remove'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('groupId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(3, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, typeof (_e = typeof Dtos_1.UserIdsArray !== "undefined" && Dtos_1.UserIdsArray) === "function" ? _e : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], GroupController.prototype, "removeUsersFromGroup", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':groupId/users/set'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Param)('groupId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(3, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, BigInt, typeof (_f = typeof Dtos_1.UserIdsArray !== "undefined" && Dtos_1.UserIdsArray) === "function" ? _f : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], GroupController.prototype, "setUsersForGroup", null);
exports.GroupController = GroupController = tslib_1.__decorate([
    (0, common_1.Controller)('projects/:projectId/groups/'),
    (0, common_1.UseInterceptors)(json_serializer_interceptor_1.JsonSerializerInterceptor),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof group_manager_service_1.GroupManagerService !== "undefined" && group_manager_service_1.GroupManagerService) === "function" ? _a : Object])
], GroupController);


/***/ }),
/* 123 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectTagManagerService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(15);
const Entities_1 = __webpack_require__(16);
const validation_1 = __webpack_require__(79);
let ProjectTagManagerService = class ProjectTagManagerService {
    constructor(projectTagRepository) {
        this.projectTagRepository = projectTagRepository;
    }
    async getProjectTags() {
        return this.projectTagRepository.find();
    }
    async createProjectTag(data) {
        if (!data.name) {
            throw new common_1.BadRequestException('Tag name is required');
        }
        if (!(0, validation_1.validateName)(data.name)) {
            throw new common_1.BadRequestException('Tag name contains invalid characters or is empty after trimming');
        }
        try {
            const newTag = this.projectTagRepository.create({
                name: (0, validation_1.sanitizeName)(data.name),
            });
            return this.projectTagRepository.save(newTag);
        }
        catch (error) {
            const dbError = error;
            if (dbError.code === 'ER_DUP_ENTRY') {
                throw new common_1.BadRequestException('A tag with this name already exists');
            }
            console.error('Error creating project tag:', error);
            throw new common_1.InternalServerErrorException('Failed to create project tag');
        }
    }
    async updateProjectTag(id, data) {
        if (!data.name) {
            throw new common_1.BadRequestException('Tag name is required');
        }
        if (!(0, validation_1.validateName)(data.name)) {
            throw new common_1.BadRequestException('Tag name contains invalid characters or is empty after trimming');
        }
        try {
            const sanitizedName = (0, validation_1.sanitizeName)(data.name);
            await this.projectTagRepository.update(id, { name: sanitizedName });
            return this.projectTagRepository.findOne({ where: { id: BigInt(id) } });
        }
        catch (error) {
            const dbError = error;
            if (dbError.code === 'ER_DUP_ENTRY') {
                throw new common_1.BadRequestException('A tag with this name already exists');
            }
            console.error('Error updating project tag:', error);
            throw new common_1.InternalServerErrorException('Failed to update project tag');
        }
    }
    async deleteProjectTag(id) {
        try {
            return this.projectTagRepository.delete(id);
        }
        catch (error) {
            console.error('Error deleting project tag:', error);
            throw new common_1.InternalServerErrorException('Failed to delete project tag');
        }
    }
};
exports.ProjectTagManagerService = ProjectTagManagerService;
exports.ProjectTagManagerService = ProjectTagManagerService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_1.InjectRepository)(Entities_1.ProjectTagEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object])
], ProjectTagManagerService);


/***/ }),
/* 124 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectTagController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const project_tag_manager_service_1 = __webpack_require__(123);
let ProjectTagController = class ProjectTagController {
    constructor(projectTagService) {
        this.projectTagService = projectTagService;
    }
    getProjectTags() {
        return this.projectTagService.getProjectTags();
    }
    createProjectTag(newTagData) {
        return this.projectTagService.createProjectTag(newTagData);
    }
    updateProjectTag(id, tagUpdateData) {
        return this.projectTagService.updateProjectTag(id, tagUpdateData);
    }
    deleteProjectTag(id) {
        return this.projectTagService.deleteProjectTag(id);
    }
};
exports.ProjectTagController = ProjectTagController;
tslib_1.__decorate([
    (0, common_1.Get)('all'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ProjectTagController.prototype, "getProjectTags", null);
tslib_1.__decorate([
    (0, common_1.Post)('create'),
    tslib_1.__param(0, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", void 0)
], ProjectTagController.prototype, "createProjectTag", null);
tslib_1.__decorate([
    (0, common_1.Put)('update/:id'),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", void 0)
], ProjectTagController.prototype, "updateProjectTag", null);
tslib_1.__decorate([
    (0, common_1.Delete)('delete/:id'),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", void 0)
], ProjectTagController.prototype, "deleteProjectTag", null);
exports.ProjectTagController = ProjectTagController = tslib_1.__decorate([
    (0, common_1.Controller)('project-tag'),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof project_tag_manager_service_1.ProjectTagManagerService !== "undefined" && project_tag_manager_service_1.ProjectTagManagerService) === "function" ? _a : Object])
], ProjectTagController);


/***/ }),
/* 125 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(1);
tslib_1.__exportStar(__webpack_require__(126), exports);


/***/ }),
/* 126 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthEntity = void 0;
const tslib_1 = __webpack_require__(1);
const typeorm_1 = __webpack_require__(15);
let AuthEntity = class AuthEntity {
};
exports.AuthEntity = AuthEntity;
tslib_1.__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    tslib_1.__metadata("design:type", String)
], AuthEntity.prototype, "sessionId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    tslib_1.__metadata("design:type", BigInt)
], AuthEntity.prototype, "userId", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 2000 }),
    tslib_1.__metadata("design:type", String)
], AuthEntity.prototype, "accessToken", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 2000, nullable: true }),
    tslib_1.__metadata("design:type", String)
], AuthEntity.prototype, "refreshToken", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: false }),
    tslib_1.__metadata("design:type", typeof (_a = typeof Date !== "undefined" && Date) === "function" ? _a : Object)
], AuthEntity.prototype, "accessTokenExpiresAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    tslib_1.__metadata("design:type", typeof (_b = typeof Date !== "undefined" && Date) === "function" ? _b : Object)
], AuthEntity.prototype, "refreshTokenExpiresAt", void 0);
tslib_1.__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: false }),
    tslib_1.__metadata("design:type", typeof (_c = typeof Date !== "undefined" && Date) === "function" ? _c : Object)
], AuthEntity.prototype, "lastActivityAt", void 0);
exports.AuthEntity = AuthEntity = tslib_1.__decorate([
    (0, typeorm_1.Entity)()
], AuthEntity);


/***/ }),
/* 127 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MongoModule = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const mongoose_1 = __webpack_require__(41);
const chat_message_schema_1 = __webpack_require__(85);
const chat_room_schema_1 = __webpack_require__(86);
const translation_schema_1 = __webpack_require__(100);
const manifest_schema_1 = __webpack_require__(128);
let MongoModule = class MongoModule {
};
exports.MongoModule = MongoModule;
exports.MongoModule = MongoModule = tslib_1.__decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'ChatMessage', schema: chat_message_schema_1.ChatMessageSchema },
                { name: 'ChatRoom', schema: chat_room_schema_1.ChatRoomSchema },
                { name: 'TranslationString', schema: translation_schema_1.TranslationStringSchema },
                { name: 'Manifest', schema: manifest_schema_1.ManifestSchema },
            ])
        ],
        exports: [mongoose_1.MongooseModule]
    })
], MongoModule);


/***/ }),
/* 128 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ManifestSchema = exports.Manifest = void 0;
const tslib_1 = __webpack_require__(1);
const mongoose_1 = __webpack_require__(41);
let Manifest = class Manifest {
};
exports.Manifest = Manifest;
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    tslib_1.__metadata("design:type", String)
], Manifest.prototype, "fileId", void 0);
tslib_1.__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    tslib_1.__metadata("design:type", Array)
], Manifest.prototype, "entries", void 0);
exports.Manifest = Manifest = tslib_1.__decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Manifest);
exports.ManifestSchema = mongoose_1.SchemaFactory.createForClass(Manifest);


/***/ }),
/* 129 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WalletController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const swagger_1 = __webpack_require__(130);
const jwt_guard_1 = __webpack_require__(56);
const payment_manager_service_1 = __webpack_require__(88);
const withdraw_dto_1 = __webpack_require__(131);
const wallet_manager_service_1 = __webpack_require__(98);
const axios_1 = tslib_1.__importDefault(__webpack_require__(89));
let WalletController = class WalletController {
    constructor(walletManagerService, paypalService) {
        this.walletManagerService = walletManagerService;
        this.paypalService = paypalService;
    }
    async getWallet(req) {
        const details = await this.walletManagerService.getWalletDetails(req.user.id);
        const latestTransaction = await this.walletManagerService.getLatestTransaction(req.user.id);
        return { ...details, latestTransaction };
    }
    async withdraw(req, dto) {
        return this.paypalService.withdraw(req.user.id, dto);
    }
    async linkPaypal(req, paypalEmail) {
        await this.walletManagerService.linkPaypal(req.user.id, paypalEmail);
        return { success: true, paypalEmail };
    }
    getPaypalConnectUrl(req) {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const redirectUri = encodeURIComponent(process.env.PAYPAL_REDIRECT_URI || '${import.meta.env.VITE_API_URL}/wallet/paypal/callback');
        const scope = encodeURIComponent('openid email');
        const state = encodeURIComponent(req.user.id.toString());
        const url = `https://www.sandbox.paypal.com/signin/authorize?client_id=${clientId}&response_type=code&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;
        return { url };
    }
    async paypalCallback(code, state, res) {
        if (!code || !state)
            return res.status(400).send('Missing code or state');
        try {
            const clientId = process.env.PAYPAL_CLIENT_ID || '';
            const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
            const redirectUri = process.env.PAYPAL_REDIRECT_URI || 'http://localhost:3000/api/wallet/paypal/callback';
            const tokenRes = await axios_1.default.post('https://api.sandbox.paypal.com/v1/oauth2/token', new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }), {
                auth: { username: clientId, password: clientSecret },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            const accessToken = tokenRes.data.access_token;
            const userRes = await axios_1.default.get('https://api.sandbox.paypal.com/v1/identity/openidconnect/userinfo/?schema=openid', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const email = userRes.data.email;
            const userId = BigInt(state);
            await this.walletManagerService.linkPaypal(userId, email);
            return res.redirect('/wallet?paypal=success');
        }
        catch (err) {
            return res.redirect('/wallet?paypal=fail');
        }
    }
    async updatePaypalEmail(req, email) {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Invalid email');
        }
        // Lấy wallet theo user
        const wallet = await this.walletManagerService.getOrCreateWallet(req.user.id);
        await this.walletManagerService.updatePaypalEmailByWalletId(wallet.id, email);
        return { success: true, email };
    }
    async getPendingWithdrawals(req) {
        return this.walletManagerService.getPendingWithdrawals(req.user.id);
    }
    async syncBalances() {
        return this.walletManagerService.syncAllWalletBalances();
    }
    async getUserTransactions(req) {
        return this.walletManagerService.getUserTransactions(req.user.id);
    }
};
exports.WalletController = WalletController;
tslib_1.__decorate([
    (0, common_1.Get)(),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], WalletController.prototype, "getWallet", null);
tslib_1.__decorate([
    (0, common_1.Post)('withdraw'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__param(1, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, typeof (_c = typeof withdraw_dto_1.WithdrawDto !== "undefined" && withdraw_dto_1.WithdrawDto) === "function" ? _c : Object]),
    tslib_1.__metadata("design:returntype", Promise)
], WalletController.prototype, "withdraw", null);
tslib_1.__decorate([
    (0, common_1.Post)('link-paypal'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__param(1, (0, common_1.Body)('paypalEmail')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String]),
    tslib_1.__metadata("design:returntype", Promise)
], WalletController.prototype, "linkPaypal", null);
tslib_1.__decorate([
    (0, common_1.Get)('paypal/connect'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", void 0)
], WalletController.prototype, "getPaypalConnectUrl", null);
tslib_1.__decorate([
    (0, common_1.Get)('paypal/callback'),
    tslib_1.__param(0, (0, common_1.Query)('code')),
    tslib_1.__param(1, (0, common_1.Query)('state')),
    tslib_1.__param(2, (0, common_1.Res)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], WalletController.prototype, "paypalCallback", null);
tslib_1.__decorate([
    (0, common_1.Patch)('paypal-email'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__param(1, (0, common_1.Body)('email')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String]),
    tslib_1.__metadata("design:returntype", Promise)
], WalletController.prototype, "updatePaypalEmail", null);
tslib_1.__decorate([
    (0, common_1.Get)('pending-withdrawals'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], WalletController.prototype, "getPendingWithdrawals", null);
tslib_1.__decorate([
    (0, common_1.Get)('sync-balances'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], WalletController.prototype, "syncBalances", null);
tslib_1.__decorate([
    (0, common_1.Get)('transactions'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], WalletController.prototype, "getUserTransactions", null);
exports.WalletController = WalletController = tslib_1.__decorate([
    (0, swagger_1.ApiTags)('Wallet'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('wallet'),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof wallet_manager_service_1.WalletManagerService !== "undefined" && wallet_manager_service_1.WalletManagerService) === "function" ? _a : Object, typeof (_b = typeof payment_manager_service_1.PaypalService !== "undefined" && payment_manager_service_1.PaypalService) === "function" ? _b : Object])
], WalletController);


/***/ }),
/* 130 */
/***/ ((module) => {

module.exports = require("@nestjs/swagger");

/***/ }),
/* 131 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WithdrawDto = void 0;
const tslib_1 = __webpack_require__(1);
const class_validator_1 = __webpack_require__(7);
class WithdrawDto {
}
exports.WithdrawDto = WithdrawDto;
tslib_1.__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    tslib_1.__metadata("design:type", Number)
], WithdrawDto.prototype, "amount", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsEmail)(),
    tslib_1.__metadata("design:type", String)
], WithdrawDto.prototype, "paypalEmail", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    tslib_1.__metadata("design:type", BigInt)
], WithdrawDto.prototype, "requestId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    tslib_1.__metadata("design:type", String)
], WithdrawDto.prototype, "paypalOrderId", void 0);


/***/ }),
/* 132 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PaymentController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const swagger_1 = __webpack_require__(130);
const jwt_guard_1 = __webpack_require__(56);
const payment_manager_service_1 = __webpack_require__(88);
const bigint_transform_pipe_1 = __webpack_require__(109);
let PaymentController = class PaymentController {
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    async approveTranslation(req, requestId) {
        return this.paymentService.approveTranslation(requestId, req.user.id);
    }
    async finalizeTranslation(requestId) {
        return this.paymentService.finalizeTranslation(requestId);
    }
    async handlePayPalSuccess(orderId, res) {
        const result = await this.paymentService.capturePaymentAndCreateProject(orderId);
        if (result.success) {
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:4200';
            return res.redirect(`${clientUrl}/my-requests`);
        }
        else {
            return res.redirect('/payment-failed');
        }
    }
    async handlePrivatePayPalSuccess(orderId, res) {
        const result = await this.paymentService.capturePayment(orderId);
        if (result.success) {
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:4200';
            return res.redirect(`${clientUrl}/my-requests`);
        }
        else {
            return res.redirect('/payment-failed');
        }
    }
    getTestRoute(res) {
        return res.send('✅ Test route hit!');
    }
    async approveTransaction(transactionId) {
        return this.paymentService.approveWithdrawal(transactionId);
    }
    async rejectTransaction(transactionId) {
        return this.paymentService.rejectWithdrawal(transactionId);
    }
    async getAllPendingWithdrawals() {
        // Lấy tất cả transaction rút tiền pending
        return this.paymentService.getAllPendingWithdrawals();
    }
    async capturePaypalPayment(orderId) {
        if (!orderId) {
            throw new common_1.HttpException('Missing orderId', 400);
        }
        // Gọi capturePayment, có thể tuỳ chỉnh nếu cần phân biệt loại giao dịch
        try {
            const result = await this.paymentService.capturePayment(orderId);
            return result || { success: true };
        }
        catch (e) {
            return { success: false, message: e?.toString() || 'Capture failed' };
        }
    }
};
exports.PaymentController = PaymentController;
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('approve-translation'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__param(1, (0, common_1.Body)('requestId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, BigInt]),
    tslib_1.__metadata("design:returntype", Promise)
], PaymentController.prototype, "approveTranslation", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('finalize-translation/:requestId'),
    tslib_1.__param(0, (0, common_1.Param)('requestId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt]),
    tslib_1.__metadata("design:returntype", Promise)
], PaymentController.prototype, "finalizeTranslation", null);
tslib_1.__decorate([
    (0, common_1.Get)('/paypal/success'),
    tslib_1.__param(0, (0, common_1.Query)('token')),
    tslib_1.__param(1, (0, common_1.Res)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], PaymentController.prototype, "handlePayPalSuccess", null);
tslib_1.__decorate([
    (0, common_1.Get)('/paypal/private/success'),
    tslib_1.__param(0, (0, common_1.Query)('token')),
    tslib_1.__param(1, (0, common_1.Res)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], PaymentController.prototype, "handlePrivatePayPalSuccess", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(),
    (0, common_1.Get)('/paypal/test'),
    tslib_1.__param(0, (0, common_1.Res)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", void 0)
], PaymentController.prototype, "getTestRoute", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':transactionId/approve'),
    tslib_1.__param(0, (0, common_1.Param)('transactionId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number]),
    tslib_1.__metadata("design:returntype", Promise)
], PaymentController.prototype, "approveTransaction", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':transactionId/reject'),
    tslib_1.__param(0, (0, common_1.Param)('transactionId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number]),
    tslib_1.__metadata("design:returntype", Promise)
], PaymentController.prototype, "rejectTransaction", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('withdrawals/pending'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], PaymentController.prototype, "getAllPendingWithdrawals", null);
tslib_1.__decorate([
    (0, common_1.Post)('paypal/capture'),
    tslib_1.__param(0, (0, common_1.Body)('orderId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], PaymentController.prototype, "capturePaypalPayment", null);
exports.PaymentController = PaymentController = tslib_1.__decorate([
    (0, swagger_1.ApiTags)('Payment'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('payment'),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof payment_manager_service_1.PaypalService !== "undefined" && payment_manager_service_1.PaypalService) === "function" ? _a : Object])
], PaymentController);


/***/ }),
/* 133 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TranslationService = void 0;
const tslib_1 = __webpack_require__(1);
const mongoose_1 = __webpack_require__(41);
const mongoose_2 = __webpack_require__(42);
const common_1 = __webpack_require__(2);
const Entities_1 = __webpack_require__(16);
const translation_schema_1 = __webpack_require__(100);
const github_manager_service_1 = __webpack_require__(92);
const logger_1 = __webpack_require__(73);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(15);
const docx_utils_extension_1 = __webpack_require__(134);
const pdf_utils_extension_1 = __webpack_require__(136);
const buffer_1 = __webpack_require__(93);
let TranslationService = class TranslationService {
    constructor(translationModel, fileRepository, githubService) {
        this.translationModel = translationModel;
        this.fileRepository = fileRepository;
        this.githubService = githubService;
    }
    async addTranslation(id, translatedText, language) {
        // Tìm bản ghi gốc để lấy thông tin
        const originalEntry = await this.translationModel.findById(id);
        if (!originalEntry)
            throw new Error('Manifest entry not found');
        const existingTranslation = await this.translationModel.findOne({
            projectId: originalEntry.projectId,
            branchId: originalEntry.branchId,
            fileId: originalEntry.fileId,
            originalText: originalEntry.originalText,
            language: language,
        });
        let entry;
        if (existingTranslation) {
            // Update bản dịch hiện có
            existingTranslation.translatedText = translatedText;
            await existingTranslation.save();
            entry = existingTranslation;
        }
        else {
            // Tạo bản ghi mới cho ngôn ngữ này
            entry = await this.translationModel.create({
                projectId: originalEntry.projectId,
                branchId: originalEntry.branchId,
                fileId: originalEntry.fileId,
                manifestEntryId: originalEntry.manifestEntryId,
                originalText: originalEntry.originalText,
                translatedText: translatedText,
                language: language,
                filePart: originalEntry.filePart,
                font: originalEntry.font,
                style: originalEntry.style,
                position: originalEntry.position,
                obsolete: false,
            });
        }
        const fileId = entry.fileId;
        const fileEntity = await this.fileRepository.findOne({
            where: { id: BigInt(fileId) },
            relations: ['project'],
        });
        if (!fileEntity || !fileEntity.project) {
            throw new Error('File or project not found');
        }
        let updatedBuffer;
        if (fileEntity.fileType ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const entries = await this.translationModel
                .find({ fileId, language })
                .lean();
            const translations = new Map();
            for (const e of entries) {
                if (e.translatedText && e.translatedText.trim().length > 0) {
                    translations.set(e.originalText, e.translatedText);
                }
            }
            const originalBuffer = fileEntity.fileContent;
            updatedBuffer = await (0, docx_utils_extension_1.replaceDocxText)(originalBuffer, translations);
        }
        else if (fileEntity.fileType === 'application/pdf') {
            const entries = await this.translationModel
                .find({ fileId, language })
                .lean();
            const translatedEntries = entries.map((e) => ({
                text: e.translatedText?.trim() ? e.translatedText : e.originalText,
            }));
            const originalBuffer = fileEntity.fileContent;
            updatedBuffer = await (0, pdf_utils_extension_1.buildTranslatedPdf)(originalBuffer, translatedEntries);
        }
        else {
            updatedBuffer = await this.applyTranslation(fileId, language);
        }
        // --- Commit to GitHub ---
        const repoName = `project-${fileEntity.project.id}`;
        const safeFileName = fileEntity.fileName.replace(/[\\/:*?"<>|]/g, '_');
        const path = `${language}/${safeFileName}`;
        try {
            await this.githubService.commitChange({
                repo: repoName,
                branch: 'main',
                path,
                content: updatedBuffer,
                message: `Update translations for ${fileEntity.fileName} (${language})`,
            });
            logger_1.logger.log(`✅ Translation committed to GitHub: ${repoName}/${path}`);
        }
        catch (err) {
            logger_1.logger.error(`❌ Error committing translation to GitHub: ${err}`);
        }
        return entry;
    }
    async applyTranslation(fileId, language) {
        const fileEntity = await this.fileRepository.findOne({
            where: { id: BigInt(fileId) },
        });
        if (!fileEntity)
            throw new Error('File not found');
        const entriesRaw = await this.translationModel
            .find({ fileId, language })
            .lean();
        const entries = entriesRaw.map((e) => ({
            text: e.translatedText && e.translatedText.trim().length > 0
                ? e.translatedText
                : e.originalText,
            style: e.style,
            font: e.font,
        }));
        return rebuildFileWithManifest(fileEntity.fileType, entries);
    }
    async revertTranslation(fileId) {
        const fileEntity = await this.fileRepository.findOne({
            where: { id: BigInt(fileId) },
        });
        if (!fileEntity)
            throw new Error('File not found');
        const entries = await this.translationModel.find({ fileId }).lean();
        const map = new Map();
        for (const e of entries) {
            map.set(e.manifestEntryId, {
                text: e.originalText,
                style: e.style || {},
                font: e.font || 'default',
            });
        }
        const entriesArray = Array.from(map.values());
        return rebuildFileWithManifest(fileEntity.fileType, entriesArray);
    }
    async previewTranslation(fileId, language) {
        const fileEntity = await this.fileRepository.findOne({
            where: { id: BigInt(fileId) },
        });
        if (!fileEntity)
            throw new Error('File not found');
        // Build translated file buffer
        const buffer = await this.applyTranslation(fileId, language);
        // Return preview based on type
        switch (fileEntity.fileType) {
            case 'text/plain':
            case 'application/json': {
                // For text-based files, return the UTF-8 string
                return {
                    fileType: fileEntity.fileType,
                    preview: buffer.toString('utf8'),
                };
            }
            case 'application/pdf':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
                // For binary files, return base64 for preview
                return {
                    fileType: fileEntity.fileType,
                    preview: buffer.toString('base64'),
                };
            }
            default: {
                // Fallback to utf8
                return {
                    fileType: fileEntity.fileType,
                    preview: buffer.toString('utf8'),
                };
            }
        }
    }
    async previewTranslationPart(fileId, language, limit = 3, skip = 0) {
        const fileEntity = await this.fileRepository.findOne({
            where: { id: BigInt(fileId) },
        });
        if (!fileEntity)
            throw new Error('File not found');
        const entries = await this.translationModel
            .find({ fileId, language })
            .skip(skip)
            .limit(limit)
            .lean();
        const previews = entries.map((e) => e.translatedText?.trim() ? e.translatedText : e.originalText);
        return {
            fileType: fileEntity.fileType,
            previews,
        };
    }
    async exportTranslation(fileId, language) {
        const fileEntity = await this.fileRepository.findOne({
            where: { id: BigInt(fileId) },
            relations: ['project'],
        });
        if (!fileEntity || !fileEntity.project) {
            throw new Error('File not found');
        }
        let buffer;
        if (fileEntity.fileType ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const entries = await this.translationModel
                .find({ fileId, language })
                .lean();
            const translations = new Map();
            for (const e of entries) {
                if (e.translatedText && e.translatedText.trim().length > 0) {
                    translations.set(e.originalText, e.translatedText);
                }
            }
            buffer = await (0, docx_utils_extension_1.replaceDocxText)(fileEntity.fileContent, translations);
        }
        else if (fileEntity.fileType === 'application/pdf') {
            const entries = await this.translationModel
                .find({ fileId, language })
                .lean();
            const translatedEntries = entries.map((e) => ({
                text: e.translatedText?.trim() ? e.translatedText : e.originalText,
            }));
            buffer = await (0, pdf_utils_extension_1.buildTranslatedPdf)(fileEntity.fileContent, translatedEntries);
        }
        else {
            buffer = await this.applyTranslation(fileId, language);
        }
        const repoName = `project-${fileEntity.project.id}`;
        const safeFileName = fileEntity.fileName.replace(/[\\/:*?"<>|]/g, '_');
        await this.githubService.commitChange({
            repo: repoName,
            branch: 'main',
            path: `${language}/${safeFileName}`,
            content: buffer,
            message: `Exported translation for ${fileEntity.fileName} (${language})`,
        });
        const githubUrl = `https://raw.githubusercontent.com/<IAmKou>/${repoName}/main/${language}/${encodeURIComponent(safeFileName)}`;
        return { githubUrl };
    }
    async getAllString(projectId, branchId, language, fileId, filePart) {
        const baseQuery = { projectId, branchId };
        if (fileId)
            baseQuery.fileId = fileId;
        if (filePart !== undefined)
            baseQuery.filePart = filePart;
        const baseStrings = await this.translationModel
            .find(baseQuery)
            .sort({ filePart: 1, _id: 1 })
            .lean();
        // Lấy bản dịch của ngôn ngữ được chọn
        const translationQuery = { projectId, branchId, language };
        if (fileId)
            translationQuery.fileId = fileId;
        if (filePart !== undefined)
            translationQuery.filePart = filePart;
        const translatedStrings = await this.translationModel
            .find(translationQuery)
            .sort({ filePart: 1, _id: 1 })
            .lean();
        // Tạo map để merge nhanh: originalText -> translatedText
        const translationMap = new Map();
        translatedStrings.forEach((str) => {
            translationMap.set(str.originalText, str.translatedText);
        });
        // Merge base strings với bản dịch của ngôn ngữ được chọn
        const mergedStrings = baseStrings.map((str) => {
            const translatedText = translationMap.get(str.originalText) || '';
            return {
                ...str,
                translatedText,
            };
        });
        // Lấy tên file
        const fileIds = Array.from(new Set(mergedStrings.map((str) => str.fileId)));
        const fileNamesMap = {};
        if (fileIds.length > 0) {
            const files = await this.fileRepository.find({
                where: { id: (0, typeorm_2.In)(fileIds.map((id) => BigInt(id))) },
            });
            files.forEach((f) => {
                fileNamesMap[String(f.id)] = f.fileName;
            });
        }
        return mergedStrings.map((str) => ({
            id: str._id.toString(),
            originalText: str.originalText,
            translatedText: str.translatedText || '',
            fileId: str.fileId,
            filePart: str.filePart ?? 0,
            fileName: fileNamesMap[str.fileId] || '',
        }));
    }
    async getFilePages(fileId, projectId, branchId) {
        // Lấy tất cả strings của file để phân tích số trang
        const strings = await this.translationModel
            .find({ fileId, projectId, branchId })
            .sort({ filePart: 1, _id: 1 })
            .lean();
        // Nhóm strings theo filePart (trang)
        const pages = new Map();
        for (const str of strings) {
            const page = str.filePart || 0;
            if (!pages.has(page)) {
                pages.set(page, []);
            }
            pages.get(page).push(str);
        }
        // Tạo danh sách trang với thông tin chi tiết
        const sortedPages = Array.from(pages.keys()).sort((a, b) => a - b);
        const pageInfo = sortedPages.map(page => ({
            pageNumber: page + 1, // Hiển thị từ 1 thay vì 0
            filePart: page,
            stringCount: pages.get(page).length,
            hasTranslatedStrings: pages.get(page).some(str => str.translatedText && str.translatedText.trim().length > 0)
        }));
        return {
            fileId,
            totalPages: sortedPages.length,
            pages: pageInfo
        };
    }
};
exports.TranslationService = TranslationService;
exports.TranslationService = TranslationService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, mongoose_1.InjectModel)(translation_schema_1.TranslationString.name)),
    tslib_1.__param(1, (0, typeorm_1.InjectRepository)(Entities_1.FileEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof github_manager_service_1.GitHubService !== "undefined" && github_manager_service_1.GitHubService) === "function" ? _c : Object])
], TranslationService);
async function rebuildFileWithManifest(fileType, entries) {
    switch (fileType) {
        case 'text/plain': {
            const combined = entries.map((e) => e.text).join('\n');
            return buffer_1.Buffer.from(combined, 'utf8');
        }
        case 'application/json': {
            const jsonArray = entries.map((e) => e.text);
            return buffer_1.Buffer.from(JSON.stringify(jsonArray, null, 2), 'utf8');
        }
        case 'application/pdf': {
            const { PDFDocument, StandardFonts } = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 137, 23));
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            let y = page.getHeight() - 24;
            for (const e of entries) {
                page.drawText(e.text, { x: 50, y, font, size: 12 });
                y -= 16;
                if (y < 40) {
                    const newPage = pdfDoc.addPage();
                    y = newPage.getHeight() - 24;
                }
            }
            const pdfBytes = await pdfDoc.save();
            return buffer_1.Buffer.from(pdfBytes);
        }
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
            const { Document, Packer, Paragraph, TextRun } = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 167, 23));
            const paragraphs = entries.map((e) => {
                return new Paragraph({
                    children: [
                        new TextRun({
                            text: e.text,
                            bold: e.style?.bold || false,
                            italics: e.style?.italic || false,
                            color: e.style?.color,
                            size: e.style?.fontSize ? e.style.fontSize * 2 : undefined,
                            font: e.font !== 'default' ? e.font : undefined,
                        }),
                    ],
                });
            });
            const doc = new Document({ sections: [{ children: paragraphs }] });
            const buffer = await Packer.toBuffer(doc);
            return buffer;
        }
        default: {
            const defaultCombined = entries.map((e) => e.text).join('\n');
            return buffer_1.Buffer.from(defaultCombined, 'utf8');
        }
    }
}


/***/ }),
/* 134 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.replaceDocxText = replaceDocxText;
const tslib_1 = __webpack_require__(1);
const docx4js_1 = tslib_1.__importDefault(__webpack_require__(135));
/**
 * Replace text in a DOCX file while preserving layout, styles, tables, images, etc.
 * @param originalBuffer Buffer of the original docx file
 * @param translations Map of originalText -> translatedText
 * @returns Buffer of the updated docx
 */
async function replaceDocxText(originalBuffer, translations) {
    const docx = await docx4js_1.default.load(originalBuffer);
    const body = docx.mainDocumentPart?.document?.body;
    if (!body) {
        throw new Error('DOCX body not found. The file may be corrupted or not a valid DOCX.');
    }
    body.descendants().forEach((node) => {
        if (node.type === 'w:t') {
            const oldText = node.text();
            if (oldText && translations.has(oldText)) {
                node.text(translations.get(oldText));
            }
        }
    });
    const out = await docx.save('nodebuffer');
    return out;
}


/***/ }),
/* 135 */
/***/ ((module) => {

module.exports = require("docx4js");

/***/ }),
/* 136 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildTranslatedPdf = buildTranslatedPdf;
const pdf_lib_1 = __webpack_require__(137);
/**
 * Build a translated PDF from text entries.
 * ⚠️ This is a reconstruction, not an in-place edit.
 * @param originalBuffer Original PDF (currently unused in simple rebuild, see notes below)
 * @param entries Array of translated entries (in order)
 * @returns Buffer of new PDF
 */
async function buildTranslatedPdf(originalBuffer, entries) {
    const originalPdf = await pdf_lib_1.PDFDocument.load(originalBuffer);
    // const pageCount = originalPdf.getPageCount();
    const [firstPage] = originalPdf.getPages();
    const { width, height } = firstPage.getSize();
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    let page = pdfDoc.addPage([width, height]);
    const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    let y = height - 24;
    const lineHeight = 16;
    const margin = 50;
    for (const entry of entries) {
        // Draw text
        page.drawText(entry.text, {
            x: margin,
            y,
            size: 12,
            font,
            color: (0, pdf_lib_1.rgb)(0, 0, 0),
        });
        y -= lineHeight;
        if (y < 40) {
            page = pdfDoc.addPage([width, height]);
            y = height - 24;
        }
    }
    const newPdfBytes = await pdfDoc.save();
    return Buffer.from(newPdfBytes);
}


/***/ }),
/* 137 */
/***/ ((module) => {

module.exports = require("pdf-lib");

/***/ }),
/* 138 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FileController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const file_manager_service_1 = __webpack_require__(107);
const jwt_guard_1 = __webpack_require__(56);
const platform_express_1 = __webpack_require__(113);
const bigint_transform_pipe_1 = __webpack_require__(109);
let FileController = class FileController {
    constructor(fileService) {
        this.fileService = fileService;
    }
    async getProjectFiles(projectId) {
        return this.fileService.getProjectFiles(projectId);
    }
    async uploadFile(file, body, req) {
        return this.fileService.handleUpload(file, req.user.id, body.projectId, body.branchId);
    }
    async uploadTempFile(file, req) {
        return this.fileService.saveTempFile(file, req.user.id);
    }
    async uploadRequestFile(requestId, file, req) {
        return this.fileService.uploadFileForRequest(file, req.user.id, requestId);
    }
    async deleteFile(fileId, req) {
        return this.fileService.deleteFile(fileId, req.user.id);
    }
    async extractStringsFromFile(fileId, req) {
        return this.fileService.extractStringsFromFile(fileId, req.user.id);
    }
    async getFileExtractLog(fileId) {
        const file = await this.fileService.getFileById(fileId);
        return { extractLog: file?.extractLog || '' };
    }
    async getFileById(fileId) {
        return this.fileService.getFileById(fileId);
    }
    async getFilePreview(fileId) {
        return this.fileService.getFilePreview(fileId);
    }
    async downloadFile(fileId, res) {
        const file = await this.fileService.getFileById(fileId);
        if (!file) {
            throw new common_1.NotFoundException(`File with ID ${fileId} not found`);
        }
        res.set({
            'Content-Type': file.fileType,
            'Content-Disposition': `attachment; filename="${file.fileName}"`,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.send(file.fileContent);
    }
};
exports.FileController = FileController;
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('project/:projectId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt]),
    tslib_1.__metadata("design:returntype", Promise)
], FileController.prototype, "getProjectFiles", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } })),
    tslib_1.__param(0, (0, common_1.UploadedFile)()),
    tslib_1.__param(1, (0, common_1.Body)()),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_c = typeof Express !== "undefined" && (_b = Express.Multer) !== void 0 && _b.File) === "function" ? _c : Object, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], FileController.prototype, "uploadFile", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('upload-temp'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } })),
    tslib_1.__param(0, (0, common_1.UploadedFile)()),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_e = typeof Express !== "undefined" && (_d = Express.Multer) !== void 0 && _d.File) === "function" ? _e : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], FileController.prototype, "uploadTempFile", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':requestId/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } })),
    tslib_1.__param(0, (0, common_1.Param)('requestId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.UploadedFile)()),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_g = typeof Express !== "undefined" && (_f = Express.Multer) !== void 0 && _f.File) === "function" ? _g : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], FileController.prototype, "uploadRequestFile", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':fileId'),
    tslib_1.__param(0, (0, common_1.Param)('fileId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], FileController.prototype, "deleteFile", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':fileId/extract-strings'),
    tslib_1.__param(0, (0, common_1.Param)('fileId')),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], FileController.prototype, "extractStringsFromFile", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':fileId/log'),
    tslib_1.__param(0, (0, common_1.Param)('fileId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], FileController.prototype, "getFileExtractLog", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':fileId'),
    tslib_1.__param(0, (0, common_1.Param)('fileId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], FileController.prototype, "getFileById", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':fileId/preview'),
    tslib_1.__param(0, (0, common_1.Param)('fileId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], FileController.prototype, "getFilePreview", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':fileId/download'),
    tslib_1.__param(0, (0, common_1.Param)('fileId')),
    tslib_1.__param(1, (0, common_1.Res)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], FileController.prototype, "downloadFile", null);
exports.FileController = FileController = tslib_1.__decorate([
    (0, common_1.Controller)('files'),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof file_manager_service_1.FileService !== "undefined" && file_manager_service_1.FileService) === "function" ? _a : Object])
], FileController);


/***/ }),
/* 139 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TranslationController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const translation_manager_service_1 = __webpack_require__(133);
const jwt_guard_1 = __webpack_require__(56);
let TranslationController = class TranslationController {
    constructor(translationService) {
        this.translationService = translationService;
    }
    async getAllTranslationStrings(projectId, branchId, language, fileId, filePart) {
        return this.translationService.getAllString(projectId, branchId, language, fileId, filePart);
    }
    async getFilePages(fileId, projectId, branchId) {
        return this.translationService.getFilePages(fileId, projectId, branchId);
    }
    async translateString(id, translatedText, language) {
        try {
            return await this.translationService.addTranslation(id, translatedText, language);
        }
        catch (err) {
            if (err?.message && err.message.includes('DOCX body not found')) {
                // Trả về lỗi 400 với message rõ ràng cho FE
                return {
                    statusCode: 400,
                    message: 'DOCX file does not contain editable text. Please check your file content.'
                };
            }
            throw err;
        }
    }
    async previewTranslation(fileId, language) {
        return this.translationService.previewTranslation(fileId, language);
    }
    async exportTranslation(fileId, language) {
        return this.translationService.exportTranslation(fileId, language);
    }
};
exports.TranslationController = TranslationController;
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('strings'),
    tslib_1.__param(0, (0, common_1.Query)('projectId')),
    tslib_1.__param(1, (0, common_1.Query)('branchId')),
    tslib_1.__param(2, (0, common_1.Query)('language')),
    tslib_1.__param(3, (0, common_1.Query)('fileId')),
    tslib_1.__param(4, (0, common_1.Query)('filePart')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, String, String, Number]),
    tslib_1.__metadata("design:returntype", Promise)
], TranslationController.prototype, "getAllTranslationStrings", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('file-pages/:fileId'),
    tslib_1.__param(0, (0, common_1.Param)('fileId')),
    tslib_1.__param(1, (0, common_1.Query)('projectId')),
    tslib_1.__param(2, (0, common_1.Query)('branchId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], TranslationController.prototype, "getFilePages", null);
tslib_1.__decorate([
    (0, common_1.Post)('translate/:id'),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Body)('translatedText')),
    tslib_1.__param(2, (0, common_1.Body)('language')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], TranslationController.prototype, "translateString", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('preview/:fileId'),
    tslib_1.__param(0, (0, common_1.Param)('fileId')),
    tslib_1.__param(1, (0, common_1.Query)('language')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], TranslationController.prototype, "previewTranslation", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('export/:fileId'),
    tslib_1.__param(0, (0, common_1.Param)('fileId')),
    tslib_1.__param(1, (0, common_1.Body)('language')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], TranslationController.prototype, "exportTranslation", null);
exports.TranslationController = TranslationController = tslib_1.__decorate([
    (0, common_1.Controller)('translation'),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof translation_manager_service_1.TranslationService !== "undefined" && translation_manager_service_1.TranslationService) === "function" ? _a : Object])
], TranslationController);


/***/ }),
/* 140 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AdminTransactionController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const swagger_1 = __webpack_require__(130);
const jwt_guard_1 = __webpack_require__(56);
const role_guard_1 = __webpack_require__(60);
const for_role_decorator_1 = __webpack_require__(59);
const wallet_manager_service_1 = __webpack_require__(98);
const user_manager_service_1 = __webpack_require__(87);
let AdminTransactionController = class AdminTransactionController {
    constructor(walletManagerService, userManagerService) {
        this.walletManagerService = walletManagerService;
        this.userManagerService = userManagerService;
    }
    async getAllTransactions(userId, type, status, minAmount, maxAmount, startDate, endDate) {
        const filters = {};
        if (userId) {
            filters.userId = BigInt(userId);
        }
        if (type) {
            filters.type = type;
        }
        if (status) {
            filters.status = status;
        }
        if (minAmount) {
            filters.minAmount = parseFloat(minAmount);
        }
        if (maxAmount) {
            filters.maxAmount = parseFloat(maxAmount);
        }
        if (startDate) {
            filters.startDate = new Date(startDate);
        }
        if (endDate) {
            filters.endDate = new Date(endDate);
        }
        return this.walletManagerService.getTransactionsWithFilters(filters);
    }
    async getAllUsers() {
        return this.userManagerService.getAllUsers();
    }
    async approveTransaction(id) {
        // TODO: Implement approve transaction logic
        return { success: true, message: 'Transaction approved' };
    }
    async rejectTransaction(id) {
        // TODO: Implement reject transaction logic
        return { success: true, message: 'Transaction rejected' };
    }
};
exports.AdminTransactionController = AdminTransactionController;
tslib_1.__decorate([
    (0, common_1.Get)(),
    tslib_1.__param(0, (0, common_1.Query)('userId')),
    tslib_1.__param(1, (0, common_1.Query)('type')),
    tslib_1.__param(2, (0, common_1.Query)('status')),
    tslib_1.__param(3, (0, common_1.Query)('minAmount')),
    tslib_1.__param(4, (0, common_1.Query)('maxAmount')),
    tslib_1.__param(5, (0, common_1.Query)('startDate')),
    tslib_1.__param(6, (0, common_1.Query)('endDate')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminTransactionController.prototype, "getAllTransactions", null);
tslib_1.__decorate([
    (0, common_1.Get)('users'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminTransactionController.prototype, "getAllUsers", null);
tslib_1.__decorate([
    (0, common_1.Post)(':id/approve'),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminTransactionController.prototype, "approveTransaction", null);
tslib_1.__decorate([
    (0, common_1.Post)(':id/reject'),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminTransactionController.prototype, "rejectTransaction", null);
exports.AdminTransactionController = AdminTransactionController = tslib_1.__decorate([
    (0, swagger_1.ApiTags)('Admin Transactions'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, role_guard_1.RolesGuard),
    (0, for_role_decorator_1.ForRoles)(2, 1) // 1 = super_admin, 2 = admin
    ,
    (0, common_1.Controller)('admin/transactions'),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof wallet_manager_service_1.WalletManagerService !== "undefined" && wallet_manager_service_1.WalletManagerService) === "function" ? _a : Object, typeof (_b = typeof user_manager_service_1.UserManagerService !== "undefined" && user_manager_service_1.UserManagerService) === "function" ? _b : Object])
], AdminTransactionController);


/***/ }),
/* 141 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const chat_service_1 = __webpack_require__(84);
const jwt_guard_1 = __webpack_require__(56);
const user_manager_service_1 = __webpack_require__(87);
const mongoose_1 = __webpack_require__(42);
const platform_express_1 = __webpack_require__(113);
const multer_1 = __webpack_require__(115);
const path_1 = __webpack_require__(103);
const uuid_1 = __webpack_require__(48);
let ChatController = class ChatController {
    constructor(chatService, userService) {
        this.chatService = chatService;
        this.userService = userService;
    }
    async getRoomsForUser(userId) {
        try {
            const rooms = await this.chatService.getChatRoomsForUser(userId);
            return rooms.map(room => ({
                ...room,
                _id: room._id.toString(),
                createdBy: room.createdBy
            }));
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch chat rooms');
        }
    }
    async openDirectChat(req, targetIdentifier) {
        if (!targetIdentifier) {
            throw new common_1.BadRequestException('Target identifier is required');
        }
        const sender = req.user;
        const target = await this.userService.searchByEmailOrUsername(targetIdentifier);
        if (!target) {
            throw new common_1.NotFoundException('Target user not found');
        }
        if (target.id === sender.id) {
            throw new common_1.BadRequestException('Cannot open chat with yourself');
        }
        try {
            const room = await this.chatService.openChatBetween({
                id: Number(sender.id),
                username: sender.username,
            }, {
                id: Number(target.id),
                username: target.username,
            });
            if (!room) {
                throw new common_1.NotFoundException('Chat room could not be created');
            }
            return {
                ...room,
                _id: room._id.toString(),
            };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to create chat room');
        }
    }
    async getMessages(roomId) {
        if (!mongoose_1.Types.ObjectId.isValid(roomId)) {
            throw new common_1.BadRequestException('Invalid room ID');
        }
        try {
            const messages = await this.chatService.getMessages(new mongoose_1.Types.ObjectId(roomId));
            return messages;
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch messages');
        }
    }
    async uploadFile(file, req) {
        if (!file) {
            throw new common_1.BadRequestException('❌ No file uploaded');
        }
        // Log upload details for debugging
        console.log('📸 File upload details:', {
            originalname: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path
        });
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/uploads/chat/${file.filename}`;
        // Verify file exists after upload
        const fs = __webpack_require__(142);
        const filePath = `./uploads/chat/${file.filename}`;
        if (!fs.existsSync(filePath)) {
            console.error('❌ File was not saved properly:', filePath);
            throw new common_1.BadRequestException('❌ File upload failed - file not saved');
        }
        console.log('✅ File uploaded successfully:', fileUrl);
        return {
            url: fileUrl,
            fileName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
        };
    }
    async createGroup(req, name, memberIds) {
        if (!name || name.trim() === '') {
            throw new common_1.BadRequestException('Group name is required');
        }
        const creatorId = Number(req.user.id);
        const participants = Array.from(new Set([...memberIds, creatorId]));
        if (participants.length < 3) {
            throw new common_1.BadRequestException('A group chat must have at least 3 participants (including the creator).');
        }
        const room = await this.chatService.createGroupRoom(name.trim(), creatorId, participants);
        if (!room) {
            throw new common_1.BadRequestException('❌ Failed to create group room');
        }
        return {
            ...room,
            _id: room._id.toString(),
        };
    }
    async renameRoom(id, name, req) {
        if (!name) {
            throw new common_1.BadRequestException('Room name is required');
        }
        try {
            const room = await this.chatService.renameRoom(id, name);
            if (!room) {
                throw new common_1.NotFoundException('Room not found');
            }
            return room;
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to rename room');
        }
    }
    async deleteRoom(id, req) {
        try {
            const room = await this.chatService.deleteRoom(id);
            if (!room) {
                throw new common_1.NotFoundException('Room not found');
            }
            return { message: 'Room deleted successfully' };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to delete room');
        }
    }
    async updateMessage(id, message, req) {
        if (!message) {
            throw new common_1.BadRequestException('Message content is required');
        }
        try {
            const updatedMessage = await this.chatService.editMessage(id, message);
            if (!updatedMessage) {
                throw new common_1.NotFoundException('Message not found');
            }
            return updatedMessage;
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to update message');
        }
    }
    async deleteMessage(id, req) {
        try {
            const result = await this.chatService.deleteMessage(id);
            if (!result) {
                throw new common_1.NotFoundException('Message not found');
            }
            return { message: 'Message deleted successfully' };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to delete message');
        }
    }
    async searchUser(q) {
        if (!q) {
            throw new common_1.BadRequestException('Search query is required');
        }
        try {
            const user = await this.userService.searchByEmailOrUsername(q.trim());
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            return {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to search user');
        }
    }
    async addMember(roomId, userId, req) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
        try {
            const result = await this.chatService.addMemberToRoom(roomId, userId);
            if (!result) {
                throw new common_1.NotFoundException('Room not found or user already in room');
            }
            return { message: 'Member added successfully' };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to add member to room');
        }
    }
    async getRoomParticipants(roomId) {
        if (!mongoose_1.Types.ObjectId.isValid(roomId)) {
            throw new common_1.BadRequestException('Invalid room ID');
        }
        try {
            const participants = await this.chatService.getParticipants(roomId);
            return participants;
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch participants');
        }
    }
    async removeMember(roomId, userId, creatorId, req) {
        if (!userId || !creatorId) {
            throw new common_1.BadRequestException('User ID and creator ID are required');
        }
        try {
            const result = await this.chatService.removeMemberFromRoom(roomId, userId, creatorId);
            if (!result) {
                throw new common_1.NotFoundException('Room not found or user not in room');
            }
            return { message: 'Member removed successfully' };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to remove member from room');
        }
    }
};
exports.ChatController = ChatController;
tslib_1.__decorate([
    (0, common_1.Get)('rooms/:userId'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Param)('userId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "getRoomsForUser", null);
tslib_1.__decorate([
    (0, common_1.Post)('open-dm'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__param(1, (0, common_1.Body)('targetIdentifier')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "openDirectChat", null);
tslib_1.__decorate([
    (0, common_1.Get)('messages/:roomId'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Param)('roomId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
tslib_1.__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads/chat',
            filename: (req, file, cb) => {
                const uniqueName = `${(0, uuid_1.v4)()}${(0, path_1.extname)(file.originalname)}`;
                cb(null, uniqueName);
            },
        }),
        fileFilter: (req, file, cb) => {
            const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowed.includes(file.mimetype)) {
                return cb(new common_1.BadRequestException('❌ Only image files (jpg, png, gif, webp) are allowed.'), false);
            }
            cb(null, true);
        },
        limits: {
            fileSize: 10 * 1024 * 1024, // Increased to 10MB
        },
    })),
    tslib_1.__param(0, (0, common_1.UploadedFile)()),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_d = typeof Express !== "undefined" && (_c = Express.Multer) !== void 0 && _c.File) === "function" ? _d : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "uploadFile", null);
tslib_1.__decorate([
    (0, common_1.Post)('create-group'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__param(1, (0, common_1.Body)('name')),
    tslib_1.__param(2, (0, common_1.Body)('memberIds')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String, Array]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "createGroup", null);
tslib_1.__decorate([
    (0, common_1.Patch)('rooms/:id'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Body)('name')),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "renameRoom", null);
tslib_1.__decorate([
    (0, common_1.Delete)('rooms/:id'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "deleteRoom", null);
tslib_1.__decorate([
    (0, common_1.Patch)('messages/:id'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Body)('message')),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "updateMessage", null);
tslib_1.__decorate([
    (0, common_1.Delete)('messages/:id'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "deleteMessage", null);
tslib_1.__decorate([
    (0, common_1.Get)('search'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Query)('q')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "searchUser", null);
tslib_1.__decorate([
    (0, common_1.Patch)('rooms/:id/add-member'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Body)('userId')),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Number, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "addMember", null);
tslib_1.__decorate([
    (0, common_1.Get)('rooms/:roomId/participants'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Param)('roomId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "getRoomParticipants", null);
tslib_1.__decorate([
    (0, common_1.Patch)('rooms/:id/remove-member'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Body)('userId')),
    tslib_1.__param(2, (0, common_1.Body)('creatorId')),
    tslib_1.__param(3, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Number, Number, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatController.prototype, "removeMember", null);
exports.ChatController = ChatController = tslib_1.__decorate([
    (0, common_1.Controller)('chat'),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof chat_service_1.ChatService !== "undefined" && chat_service_1.ChatService) === "function" ? _a : Object, typeof (_b = typeof user_manager_service_1.UserManagerService !== "undefined" && user_manager_service_1.UserManagerService) === "function" ? _b : Object])
], ChatController);


/***/ }),
/* 142 */
/***/ ((module) => {

module.exports = require("fs");

/***/ }),
/* 143 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TaskManagerService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const Entities_1 = __webpack_require__(16);
const typeorm_2 = __webpack_require__(15);
const project_manager_service_1 = __webpack_require__(90);
const common_2 = __webpack_require__(21);
const translation_manager_service_1 = __webpack_require__(133);
const task_gateway_1 = __webpack_require__(144);
let TaskManagerService = class TaskManagerService {
    constructor(taskRepository, userRepository, projectGroupRepository, projectService, translationService, taskGateway) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.projectGroupRepository = projectGroupRepository;
        this.projectService = projectService;
        this.translationService = translationService;
        this.taskGateway = taskGateway;
    }
    async createTask(params) {
        const { title, description, createdById, assignedToId, groupId, dueDate, projectId, branchId, fileId, filePart, language, } = params;
        if (!createdById) {
            throw new common_1.BadRequestException('createdById is required');
        }
        if (!projectId) {
            throw new common_1.BadRequestException('projectId is required');
        }
        await this.projectService.testPermissions(BigInt(projectId), BigInt(createdById), common_2.PermissionFlags.ViewProject);
        const createdBy = await this.userRepository.findOneOrFail({
            where: { id: BigInt(createdById) },
        });
        const assignedTo = assignedToId
            ? await this.userRepository.findOne({
                where: { id: BigInt(assignedToId) },
            })
            : undefined;
        const group = groupId
            ? await this.projectGroupRepository.findOne({
                where: { id: BigInt(groupId) },
            })
            : undefined;
        const task = this.taskRepository.create({
            title,
            description,
            createdBy,
            assignedTo,
            group,
            dueDate,
            projectId,
            branchId,
            fileId,
            filePart,
            language,
        });
        await this.taskRepository.save(task);
        this.taskGateway.emitTaskUpdate(task);
        return task;
    }
    async getTasksByProject(projectId) {
        const tasks = await this.taskRepository.find({
            where: { projectId },
            relations: ['createdBy', 'assignedTo', 'group'],
            order: { createdAt: 'DESC' },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                projectId: true,
                branchId: true,
                fileId: true,
                filePart: true,
                language: true,
                dueDate: true,
                createdAt: true,
                startedAt: true,
                completedAt: true,
                createdBy: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatarUrl: true,
                },
                assignedTo: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatarUrl: true,
                },
                group: true,
            },
        });
        return tasks;
    }
    async getTask(id) {
        const task = await this.taskRepository.findOne({
            where: { id: BigInt(id) },
            relations: ['createdBy', 'assignedTo', 'group'],
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                projectId: true,
                branchId: true,
                fileId: true,
                filePart: true,
                language: true,
                dueDate: true,
                createdAt: true,
                startedAt: true,
                completedAt: true,
                createdBy: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatarUrl: true,
                },
                assignedTo: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatarUrl: true,
                },
                group: true,
            },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        return task;
    }
    async updateTask(id, dto) {
        const task = await this.taskRepository.findOne({
            where: { id: BigInt(id) },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        // Update fields if provided
        if (dto.title !== undefined)
            task.title = dto.title;
        if (dto.description !== undefined)
            task.description = dto.description;
        if (dto.status !== undefined) {
            // Nếu chuyển sang in_progress và chưa có startedAt thì set startedAt
            if (dto.status === 'in_progress' && !task.startedAt) {
                task.startedAt = new Date();
            }
            // Nếu chuyển sang completed thì set completedAt
            if (dto.status === 'completed' && !task.completedAt) {
                task.completedAt = new Date();
            }
            task.status = dto.status;
        }
        if (dto.dueDate !== undefined)
            task.dueDate = new Date(dto.dueDate);
        if (dto.assignedToId !== undefined) {
            task.assignedTo = dto.assignedToId
                ? await this.userRepository.findOne({
                    where: { id: BigInt(dto.assignedToId) },
                }) || undefined
                : undefined;
        }
        if (dto.groupId !== undefined) {
            task.group = dto.groupId
                ? await this.projectGroupRepository.findOne({
                    where: { id: BigInt(dto.groupId) },
                }) || undefined
                : undefined;
        }
        await this.taskRepository.save(task);
        this.taskGateway.emitTaskUpdate(task);
        return this.getTask(id);
    }
    async deleteTask(id) {
        const task = await this.getTask(id);
        await this.taskRepository.remove(task);
        this.taskGateway.emitTaskDelete(BigInt(id));
        return { success: true };
    }
    async closeTask(id, userId) {
        const task = await this.taskRepository.findOne({
            where: { id: BigInt(id) },
            relations: ['createdBy', 'assignedTo', 'group'],
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        // Check if user has permission to close this task
        const user = await this.userRepository.findOne({
            where: { id: BigInt(userId) },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        // Allow any authenticated user to close tasks (simplified permission)
        // In production, you might want to add more specific permission checks
        const isCreator = task.createdBy.id === BigInt(userId);
        const isAssignee = task.assignedTo && task.assignedTo.id === BigInt(userId);
        // For now, allow any authenticated user to close tasks
        // You can add more specific permission logic here later
        if (!isCreator && !isAssignee) {
            // Allow project members to close tasks (simplified)
            // In a real app, you'd check project membership here
        }
        // Update task status to closed
        task.status = Entities_1.TaskStatus.Closed;
        // Set closedAt timestamp if not already set
        if (!task.completedAt) {
            task.completedAt = new Date();
        }
        await this.taskRepository.save(task);
        this.taskGateway.emitTaskUpdate(task);
        return this.getTask(id);
    }
    async reopenTask(id, userId) {
        const task = await this.taskRepository.findOne({
            where: { id: BigInt(id) },
            relations: ['createdBy', 'assignedTo', 'group'],
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        // Check if user has permission to reopen this task
        const user = await this.userRepository.findOne({
            where: { id: BigInt(userId) },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        // Allow any authenticated user to reopen tasks (simplified permission)
        // In production, you might want to add more specific permission checks
        const isCreator = task.createdBy.id === BigInt(userId);
        const isAssignee = task.assignedTo && task.assignedTo.id === BigInt(userId);
        // For now, allow any authenticated user to reopen tasks
        // You can add more specific permission logic here later
        if (!isCreator && !isAssignee) {
            // Allow project members to reopen tasks (simplified)
            // In a real app, you'd check project membership here
        }
        // Check if task is actually closed
        if (task.status !== 'closed') {
            throw new common_1.BadRequestException('Task is not closed');
        }
        // Update task status back to pending (To do)
        task.status = Entities_1.TaskStatus.Pending;
        // Clear completedAt timestamp since task is reopened
        task.completedAt = undefined;
        await this.taskRepository.save(task);
        this.taskGateway.emitTaskUpdate(task);
        return this.getTask(id);
    }
    async getTasksByUser(userId) {
        const tasks = await this.taskRepository.find({
            where: [
                { assignedTo: { id: BigInt(userId) } },
                { createdBy: { id: BigInt(userId) } },
            ],
            relations: ['createdBy', 'assignedTo', 'group'],
            order: { createdAt: 'DESC' },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                projectId: true,
                branchId: true,
                fileId: true,
                filePart: true,
                language: true,
                dueDate: true,
                createdAt: true,
                createdBy: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatarUrl: true,
                },
                assignedTo: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatarUrl: true,
                },
                group: true,
            },
        });
        return tasks;
    }
    // async createFromPart(params: {
    //   projectId: string;
    //   branchId: string;
    //   fileId: string;
    //   filePart: number;
    //   createdById: string;
    //   assignedToId?: string;
    //   groupId?: string;
    //   dueDate?: Date;
    // }) {
    //   const strings = await this.translationService.getAllString(
    //     params.projectId,
    //     params.branchId,
    //     params.fileId,
    //     params.filePart
    //   );
    //   if (strings.length === 0)
    //     throw new NotFoundException('No strings in that part');
    //
    //   const example = strings
    //     .slice(0, 3)
    //     .map((s: any) => `- ${s.originalText}`)
    //     .join('\n');
    //   const description = `Contains ${strings.length} strings:\n${example}`;
    //   const title = `Translate part ${params.filePart}`;
    //
    //   return this.createTask({
    //     ...params,
    //     title,
    //     description,
    //   });
    // }
    async getTaskProgress(taskId) {
        const task = await this.taskRepository.findOneOrFail({
            where: { id: taskId },
        });
        if (!task.projectId ||
            task.filePart === null ||
            !task.branchId ||
            !task.fileId) {
            return null;
        }
        const strings = await this.translationService.getAllString(task.projectId, task.branchId, task.language, task.fileId, task.filePart);
        const total = strings.length;
        const translated = strings.filter((s) => s.translatedText && s.translatedText.trim() !== '').length;
        const percent = total === 0 ? 0 : Math.round((translated / total) * 100);
        return { total, translated, percent };
    }
    async getTaskHistory(taskId) {
        // For now, return only the creation history since we don't have a real history table yet
        // In a real implementation, you would:
        // 1. Create a TaskHistory entity/table
        // 2. Log all task changes to that table
        // 3. Query the history from the database
        try {
            // Get the actual task to show creation history
            const task = await this.taskRepository.findOne({
                where: { id: BigInt(taskId) },
                relations: ['createdBy'],
            });
            if (!task) {
                return [];
            }
            const history = [];
            // Always show creation history
            history.push({
                id: '1',
                taskId: taskId,
                action: 'created',
                description: 'Task was created',
                performedAt: task.createdAt.toISOString(),
                metadata: {},
            });
            // Show status changes based on current task state
            if (task.startedAt && task.status !== 'pending') {
                history.push({
                    id: '2',
                    taskId: taskId,
                    action: 'status_change',
                    description: 'Task status was changed from To do to In progress',
                    performedAt: task.startedAt.toISOString(),
                    metadata: {
                        fromStatus: 'pending',
                        toStatus: 'in_progress',
                    },
                });
            }
            if (task.completedAt && task.status === 'completed') {
                history.push({
                    id: '3',
                    taskId: taskId,
                    action: 'status_change',
                    description: 'Task status was changed from In progress to Done',
                    performedAt: task.completedAt.toISOString(),
                    metadata: {
                        fromStatus: 'in_progress',
                        toStatus: 'completed',
                    },
                });
            }
            if (task.status === 'closed') {
                history.push({
                    id: '4',
                    taskId: taskId,
                    action: 'closed',
                    description: 'Task was closed',
                    performedAt: task.completedAt?.toISOString() || new Date().toISOString(),
                    metadata: {},
                });
            }
            return history;
        }
        catch (error) {
            console.error('Error getting task history:', error);
            return [];
        }
    }
    async listTasks(page = 1, pageSize = 20) {
        const [tasks, count] = await this.taskRepository.findAndCount({
            skip: (page - 1) * pageSize,
            take: pageSize,
            order: { createdAt: 'DESC' },
            relations: ['assignedTo', 'group', 'createdBy'],
        });
        return {
            items: tasks,
            total: count,
            page,
            pageSize,
            totalPages: Math.ceil(count / pageSize),
        };
    }
};
exports.TaskManagerService = TaskManagerService;
exports.TaskManagerService = TaskManagerService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_1.InjectRepository)(Entities_1.TaskEntity)),
    tslib_1.__param(1, (0, typeorm_1.InjectRepository)(Entities_1.UserEntity)),
    tslib_1.__param(2, (0, typeorm_1.InjectRepository)(Entities_1.ProjectGroupEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof project_manager_service_1.ProjectManagerService !== "undefined" && project_manager_service_1.ProjectManagerService) === "function" ? _d : Object, typeof (_e = typeof translation_manager_service_1.TranslationService !== "undefined" && translation_manager_service_1.TranslationService) === "function" ? _e : Object, typeof (_f = typeof task_gateway_1.TaskGateway !== "undefined" && task_gateway_1.TaskGateway) === "function" ? _f : Object])
], TaskManagerService);


/***/ }),
/* 144 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TaskGateway = void 0;
const tslib_1 = __webpack_require__(1);
const websockets_1 = __webpack_require__(96);
const socket_io_1 = __webpack_require__(97);
let TaskGateway = class TaskGateway {
    emitTaskUpdate(task) {
        this.server.emit('task-updated', {
            id: task.id,
            title: task.title,
            status: task.status,
        });
    }
    emitTaskDelete(taskId) {
        this.server.emit('task-deleted', {
            id: taskId,
        });
    }
};
exports.TaskGateway = TaskGateway;
tslib_1.__decorate([
    (0, websockets_1.WebSocketServer)(),
    tslib_1.__metadata("design:type", typeof (_a = typeof socket_io_1.Server !== "undefined" && socket_io_1.Server) === "function" ? _a : Object)
], TaskGateway.prototype, "server", void 0);
exports.TaskGateway = TaskGateway = tslib_1.__decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: [
                'http://localhost:4200', // Always allow localhost for development
                process.env.CLIENT_URL || 'http://localhost:4200',
                process.env.PRODUCTION_URL || 'https://htt-ekpa.onrender.com',
                /^http:\/\/26\.82\.216\.\d+:4200$/ // Allow any IP in RadVPN range
            ],
            credentials: true,
        },
    })
], TaskGateway);


/***/ }),
/* 145 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TaskController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const json_serializer_interceptor_1 = __webpack_require__(110);
const task_manager_service_1 = __webpack_require__(143);
const task_dto_1 = __webpack_require__(146);
const jwt_guard_1 = __webpack_require__(56);
const bigint_transform_pipe_1 = __webpack_require__(109);
let TaskController = class TaskController {
    constructor(taskService) {
        this.taskService = taskService;
    }
    async createTask(dto, req) {
        const userId = req.user.id;
        return await this.taskService.createTask({
            ...dto,
            createdById: userId.toString(),
            dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        });
    }
    async getProjectTasks(projectId) {
        return await this.taskService.getTasksByProject(projectId);
    }
    async getTask(id) {
        return await this.taskService.getTask(id);
    }
    async updateTask(id, dto) {
        return await this.taskService.updateTask(id, dto);
    }
    async deleteTask(id) {
        return await this.taskService.deleteTask(id);
    }
    async closeTask(id, req) {
        const userId = req.user.id;
        return await this.taskService.closeTask(id, userId.toString());
    }
    async reopenTask(id, req) {
        const userId = req.user.id;
        return await this.taskService.reopenTask(id, userId.toString());
    }
    async getUserTasks(userId) {
        return await this.taskService.getTasksByUser(userId);
    }
    async getTaskProgress(id) {
        try {
            return await this.taskService.getTaskProgress(id);
        }
        catch (error) {
            throw new common_1.HttpException(error || 'Failed to get task progress', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getTaskHistory(id) {
        try {
            return await this.taskService.getTaskHistory(id);
        }
        catch (error) {
            throw new common_1.HttpException(error || 'Failed to get task history', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.TaskController = TaskController;
tslib_1.__decorate([
    (0, common_1.Post)(),
    tslib_1.__param(0, (0, common_1.Body)()),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_b = typeof task_dto_1.CreateTaskDto !== "undefined" && task_dto_1.CreateTaskDto) === "function" ? _b : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TaskController.prototype, "createTask", null);
tslib_1.__decorate([
    (0, common_1.Get)('/project/:projectId'),
    tslib_1.__param(0, (0, common_1.Param)('projectId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], TaskController.prototype, "getProjectTasks", null);
tslib_1.__decorate([
    (0, common_1.Get)(':id'),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], TaskController.prototype, "getTask", null);
tslib_1.__decorate([
    (0, common_1.Patch)(':id'),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, typeof (_c = typeof task_dto_1.UpdateTaskDto !== "undefined" && task_dto_1.UpdateTaskDto) === "function" ? _c : Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TaskController.prototype, "updateTask", null);
tslib_1.__decorate([
    (0, common_1.Delete)(':id'),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], TaskController.prototype, "deleteTask", null);
tslib_1.__decorate([
    (0, common_1.Patch)(':id/close'),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TaskController.prototype, "closeTask", null);
tslib_1.__decorate([
    (0, common_1.Patch)(':id/reopen'),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], TaskController.prototype, "reopenTask", null);
tslib_1.__decorate([
    (0, common_1.Get)('/user/:userId'),
    tslib_1.__param(0, (0, common_1.Param)('userId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], TaskController.prototype, "getUserTasks", null);
tslib_1.__decorate([
    (0, common_1.Get)(':id/progress'),
    tslib_1.__param(0, (0, common_1.Param)('id', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt]),
    tslib_1.__metadata("design:returntype", Promise)
], TaskController.prototype, "getTaskProgress", null);
tslib_1.__decorate([
    (0, common_1.Get)(':id/history'),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], TaskController.prototype, "getTaskHistory", null);
exports.TaskController = TaskController = tslib_1.__decorate([
    (0, common_1.Controller)('tasks'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)(json_serializer_interceptor_1.JsonSerializerInterceptor),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof task_manager_service_1.TaskManagerService !== "undefined" && task_manager_service_1.TaskManagerService) === "function" ? _a : Object])
], TaskController);


/***/ }),
/* 146 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateTaskDto = exports.CreateTaskDto = void 0;
const tslib_1 = __webpack_require__(1);
const class_validator_1 = __webpack_require__(7);
const task_entity_1 = __webpack_require__(36);
class CreateTaskDto {
}
exports.CreateTaskDto = CreateTaskDto;
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateTaskDto.prototype, "title", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateTaskDto.prototype, "description", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    tslib_1.__metadata("design:type", String)
], CreateTaskDto.prototype, "assignedToId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    tslib_1.__metadata("design:type", String)
], CreateTaskDto.prototype, "groupId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    tslib_1.__metadata("design:type", String)
], CreateTaskDto.prototype, "dueDate", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    tslib_1.__metadata("design:type", String)
], CreateTaskDto.prototype, "projectId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    tslib_1.__metadata("design:type", String)
], CreateTaskDto.prototype, "branchId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    tslib_1.__metadata("design:type", String)
], CreateTaskDto.prototype, "fileId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    tslib_1.__metadata("design:type", Number)
], CreateTaskDto.prototype, "filePart", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateTaskDto.prototype, "language", void 0);
class UpdateTaskDto {
}
exports.UpdateTaskDto = UpdateTaskDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateTaskDto.prototype, "title", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateTaskDto.prototype, "description", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(task_entity_1.TaskStatus),
    tslib_1.__metadata("design:type", typeof (_a = typeof task_entity_1.TaskStatus !== "undefined" && task_entity_1.TaskStatus) === "function" ? _a : Object)
], UpdateTaskDto.prototype, "status", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    tslib_1.__metadata("design:type", String)
], UpdateTaskDto.prototype, "assignedToId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    tslib_1.__metadata("design:type", String)
], UpdateTaskDto.prototype, "groupId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    tslib_1.__metadata("design:type", String)
], UpdateTaskDto.prototype, "dueDate", void 0);


/***/ }),
/* 147 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NotificationController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const jwt_guard_1 = __webpack_require__(56);
const json_serializer_interceptor_1 = __webpack_require__(110);
const bigint_transform_pipe_1 = __webpack_require__(109);
const notification_manager_service_1 = __webpack_require__(94);
let NotificationController = class NotificationController {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async getUserNotifications(req, limit, unreadOnly) {
        const notifications = await this.notificationService.getNotificationsByUserId(req.user.id, limit || 50, unreadOnly === 'true');
        return {
            notifications: notifications.map((notification) => ({
                id: notification.id.toString(),
                type: notification.type,
                message: notification.message,
                isRead: notification.isRead,
                readAt: notification.readAt,
                createdAt: notification.createdAt,
                updatedAt: notification.updatedAt,
                isGlobal: notification.isGlobal,
                createdBy: notification.creator
                    ? {
                        id: notification.creator.id.toString(),
                        username: notification.creator.username,
                        fullName: notification.creator.fullName,
                    }
                    : null,
            })),
        };
    }
    async getUserNotificationCount(req) {
        const totalCount = await this.notificationService.getNotificationCount(req.user.id);
        const unreadCount = await this.notificationService.getUnreadNotificationCount(req.user.id);
        return {
            total: totalCount,
            unread: unreadCount,
        };
    }
    async getNotification(id, req) {
        const notification = await this.notificationService.getNotificationById(id);
        // Check if notification belongs to the authenticated user or is global
        if (!notification.isGlobal && notification.userId !== req.user.id) {
            throw new Error('Unauthorized access to notification');
        }
        return {
            id: notification.id.toString(),
            type: notification.type,
            message: notification.message,
            isRead: notification.isRead,
            readAt: notification.readAt,
            createdAt: notification.createdAt,
            updatedAt: notification.updatedAt,
            isGlobal: notification.isGlobal,
            createdBy: notification.creator
                ? {
                    id: notification.creator.id.toString(),
                    username: notification.creator.username,
                    fullName: notification.creator.fullName,
                }
                : null,
        };
    }
    async markNotificationAsRead(id, req) {
        await this.notificationService.markAsRead(id, req.user.id);
        return { message: 'Notification marked as read' };
    }
    async markAllNotificationsAsRead(req) {
        await this.notificationService.markAllAsRead(req.user.id);
        return { message: 'All notifications marked as read' };
    }
    async createNotification(data, req) {
        const notification = await this.notificationService.createNotification({
            ...data,
            userId: req.user.id,
        });
        return {
            id: notification.id.toString(),
            type: notification.type,
            message: notification.message,
            createdAt: notification.createdAt,
        };
    }
    async deleteNotification(id, req) {
        // First check if notification belongs to user
        const notification = await this.notificationService.getNotificationById(id);
        if (!notification.isGlobal && notification.userId !== req.user.id) {
            throw new Error('Unauthorized access to notification');
        }
        await this.notificationService.deleteNotification(id);
        return { message: 'Notification deleted successfully' };
    }
    async updateNotification(id, data, req) {
        // First check if notification belongs to user
        const notification = await this.notificationService.getNotificationById(id);
        if (!notification.isGlobal && notification.userId !== req.user.id) {
            throw new Error('Unauthorized access to notification');
        }
        const updatedNotification = await this.notificationService.updateNotification(id, data);
        return {
            id: updatedNotification.id.toString(),
            type: updatedNotification.type,
            message: updatedNotification.message,
            isRead: updatedNotification.isRead,
            readAt: updatedNotification.readAt,
            createdAt: updatedNotification.createdAt,
            updatedAt: updatedNotification.updatedAt,
            isGlobal: updatedNotification.isGlobal,
        };
    }
    async deleteAllUserNotifications(req) {
        await this.notificationService.deleteAllUserNotifications(req.user.id);
        return { message: 'All notifications deleted successfully' };
    }
};
exports.NotificationController = NotificationController;
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__param(1, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    tslib_1.__param(2, (0, common_1.Query)('unreadOnly')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Number, String]),
    tslib_1.__metadata("design:returntype", Promise)
], NotificationController.prototype, "getUserNotifications", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)('count'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], NotificationController.prototype, "getUserNotificationCount", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id'),
    tslib_1.__param(0, (0, common_1.Param)('id', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotification", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Patch)(':id/read'),
    tslib_1.__param(0, (0, common_1.Param)('id', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], NotificationController.prototype, "markNotificationAsRead", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('mark-all-read'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], NotificationController.prototype, "markAllNotificationsAsRead", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    tslib_1.__param(0, (0, common_1.Body)()),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [typeof (_b = typeof Omit !== "undefined" && Omit) === "function" ? _b : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], NotificationController.prototype, "createNotification", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':id'),
    tslib_1.__param(0, (0, common_1.Param)('id', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], NotificationController.prototype, "deleteNotification", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Put)(':id'),
    tslib_1.__param(0, (0, common_1.Param)('id', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)()),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], NotificationController.prototype, "updateNotification", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], NotificationController.prototype, "deleteAllUserNotifications", null);
exports.NotificationController = NotificationController = tslib_1.__decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseInterceptors)(json_serializer_interceptor_1.JsonSerializerInterceptor),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof notification_manager_service_1.NotificationManagerService !== "undefined" && notification_manager_service_1.NotificationManagerService) === "function" ? _a : Object])
], NotificationController);


/***/ }),
/* 148 */
/***/ ((module) => {

module.exports = require("@nestjs/bull");

/***/ }),
/* 149 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var AiChatService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AiChatService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const openai_1 = __webpack_require__(150);
const fs_1 = tslib_1.__importDefault(__webpack_require__(142));
const pinecone_1 = __webpack_require__(151);
const openai_2 = __webpack_require__(152);
const pinecone_2 = __webpack_require__(153);
let AiChatService = AiChatService_1 = class AiChatService {
    constructor() {
        this.logger = new common_1.Logger(AiChatService_1.name);
        const { OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX, PINECONE_INDEX_HOST } = process.env;
        // Check if environment variables are set
        if (OPENAI_API_KEY && PINECONE_API_KEY && PINECONE_INDEX && PINECONE_INDEX_HOST) {
            this.openai = new openai_1.OpenAI({
                apiKey: OPENAI_API_KEY,
            });
            this.pinecone = new pinecone_1.Pinecone({
                apiKey: PINECONE_API_KEY,
            });
            this.logger.log('✅ AI service initialized with OpenAI and Pinecone');
        }
        else {
            this.logger.warn('⚠️ Missing environment variables for OpenAI or Pinecone. Running in simple mode.');
        }
    }
    /**
     * 🔹 Split text into overlapping chunks
     */
    chunkText(text, chunkSize = 1000, overlap = 200) {
        const chunks = [];
        let start = 0;
        while (start < text.length) {
            const end = Math.min(start + chunkSize, text.length);
            const chunk = text.slice(start, end);
            chunks.push(chunk);
            start += chunkSize - overlap;
        }
        return chunks;
    }
    /**
     * 🔹 Ingest docs.json into Pinecone with content in metadata
     */
    async ingestDocs() {
        const raw = fs_1.default.readFileSync('apps/server/src/util/docs.json', 'utf-8');
        const docs = JSON.parse(raw);
        const indexName = process.env.PINECONE_INDEX;
        const indexHost = process.env.PINECONE_INDEX_HOST;
        const openaiKey = process.env.OPENAI_API_KEY;
        const index = this.pinecone.Index(indexName, indexHost);
        const embeddings = new openai_2.OpenAIEmbeddings({
            apiKey: openaiKey,
            modelName: 'text-embedding-ada-002',
        });
        this.logger.log('📦 Preparing chunks...');
        const allTexts = [];
        const allMetadatas = [];
        for (const doc of docs) {
            const chunks = this.chunkText(doc.content, 1000, 200);
            chunks.forEach((chunk, i) => {
                allTexts.push(chunk);
                allMetadatas.push({
                    id: `${doc.id}_chunk_${i}`,
                    title: doc.title,
                    originalId: doc.id,
                    chunkIndex: i,
                    content: chunk, // 🔥 store actual chunk text
                });
            });
        }
        this.logger.log(`📦 Total chunks: ${allTexts.length}`);
        this.logger.log('📦 Upserting chunks to Pinecone...');
        await pinecone_2.PineconeStore.fromTexts(allTexts, allMetadatas, embeddings, {
            pineconeIndex: index,
        });
        this.logger.log('✅ Ingest done!');
        return { totalChunks: allTexts.length };
    }
    /**
     * 🔹 Ask GPT with context retrieved from Pinecone
     */
    async ask(question) {
        // Check if AI services are available
        if (!this.openai || !this.pinecone) {
            return this.getSimpleResponse(question);
        }
        try {
            const indexName = process.env.PINECONE_INDEX;
            const indexHost = process.env.PINECONE_INDEX_HOST;
            const openaiKey = process.env.OPENAI_API_KEY;
            const index = this.pinecone.Index(indexName, indexHost);
            const embeddings = new openai_2.OpenAIEmbeddings({
                apiKey: openaiKey,
                modelName: 'text-embedding-ada-002',
            });
            const queryEmbedding = await embeddings.embedQuery(question);
            const queryResponse = await index.query({
                vector: queryEmbedding,
                topK: 5,
                includeMetadata: true,
            });
            const context = queryResponse.matches
                .map((match) => match.metadata?.content)
                .filter((c) => !!c)
                .join('\n\n');
            this.logger.log(`🔍 Retrieved ${queryResponse.matches.length} context chunks`);
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant. Use the context to answer.',
                    },
                    {
                        role: 'assistant',
                        content: `Context:\n${context}`,
                    },
                    {
                        role: 'user',
                        content: question,
                    },
                ],
            });
            return completion.choices[0].message.content ?? '';
        }
        catch (error) {
            this.logger.error('Error in AI service:', error);
            return this.getSimpleResponse(question);
        }
    }
    /**
     * 🔹 Simple response when AI services are not available
     */
    getSimpleResponse(question) {
        const responses = [
            `I received your message: "${question}". I'm currently running in simple mode. To enable full AI capabilities, please set up your OpenAI and Pinecone environment variables.`,
            `Thanks for your message: "${question}". I'm here to help, but I'm currently in basic mode. For enhanced AI responses, configure your API keys.`,
            `Hello! I got your message: "${question}". I'm working in simple mode right now. Set up your AI environment variables for better responses.`,
            `I understand you said: "${question}". Currently running in basic mode. Configure OpenAI and Pinecone for advanced AI features.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
};
exports.AiChatService = AiChatService;
exports.AiChatService = AiChatService = AiChatService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], AiChatService);


/***/ }),
/* 150 */
/***/ ((module) => {

module.exports = require("openai");

/***/ }),
/* 151 */
/***/ ((module) => {

module.exports = require("@pinecone-database/pinecone");

/***/ }),
/* 152 */
/***/ ((module) => {

module.exports = require("@langchain/openai");

/***/ }),
/* 153 */
/***/ ((module) => {

module.exports = require("@langchain/community/vectorstores/pinecone");

/***/ }),
/* 154 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AiChatController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const ai_manager_service_1 = __webpack_require__(149);
const jwt_guard_1 = __webpack_require__(56);
let AiChatController = class AiChatController {
    constructor(aiChatService) {
        this.aiChatService = aiChatService;
    }
    async ask(question) {
        const answer = await this.aiChatService.ask(question);
        return { answer };
    }
    async chat(message) {
        try {
            const response = await this.aiChatService.ask(message);
            return { response };
        }
        catch (error) {
            // Fallback response if AI service fails
            return {
                response: `I received your message: "${message}". I'm currently in a simple mode. Please check your environment variables for OpenAI and Pinecone configuration.`
            };
        }
    }
    async ingest() {
        const result = await this.aiChatService.ingestDocs();
        return result;
    }
    async test() {
        return { message: 'AI Chat endpoint is working!' };
    }
};
exports.AiChatController = AiChatController;
tslib_1.__decorate([
    (0, common_1.Post)('ask'),
    tslib_1.__param(0, (0, common_1.Body)('question')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AiChatController.prototype, "ask", null);
tslib_1.__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)('chat'),
    tslib_1.__param(0, (0, common_1.Body)('message')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AiChatController.prototype, "chat", null);
tslib_1.__decorate([
    (0, common_1.Post)('ingest'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AiChatController.prototype, "ingest", null);
tslib_1.__decorate([
    (0, common_1.Post)('test'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AiChatController.prototype, "test", null);
exports.AiChatController = AiChatController = tslib_1.__decorate([
    (0, common_1.Controller)('ai'),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof ai_manager_service_1.AiChatService !== "undefined" && ai_manager_service_1.AiChatService) === "function" ? _a : Object])
], AiChatController);


/***/ }),
/* 155 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AdminNotificationController = exports.UpdateNotificationRequestDto = exports.CreateGlobalNotificationRequestDto = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const jwt_guard_1 = __webpack_require__(56);
const role_guard_1 = __webpack_require__(60);
const for_role_decorator_1 = __webpack_require__(59);
const json_serializer_interceptor_1 = __webpack_require__(110);
const bigint_transform_pipe_1 = __webpack_require__(109);
const notification_manager_service_1 = __webpack_require__(94);
class CreateGlobalNotificationRequestDto {
}
exports.CreateGlobalNotificationRequestDto = CreateGlobalNotificationRequestDto;
class UpdateNotificationRequestDto {
}
exports.UpdateNotificationRequestDto = UpdateNotificationRequestDto;
let AdminNotificationController = class AdminNotificationController {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async getGlobalNotifications(limit) {
        const notifications = await this.notificationService.getAllGlobalNotifications(limit || 50);
        return {
            notifications: notifications.map(notification => ({
                id: notification.id.toString(),
                type: notification.type,
                message: notification.message,
                isGlobal: notification.isGlobal,
                createdAt: notification.createdAt,
                createdBy: notification.creator ? {
                    id: notification.creator.id.toString(),
                    username: notification.creator.username,
                    fullName: notification.creator.fullName,
                } : null,
            })),
        };
    }
    async getGlobalNotificationCount() {
        const count = await this.notificationService.getGlobalNotificationCount();
        return { count };
    }
    async getNotificationById(id) {
        const notification = await this.notificationService.getNotificationById(id);
        return {
            id: notification.id.toString(),
            type: notification.type,
            message: notification.message,
            isGlobal: notification.isGlobal,
            userId: notification.userId?.toString(),
            createdAt: notification.createdAt,
            createdBy: notification.creator ? {
                id: notification.creator.id.toString(),
                username: notification.creator.username,
                fullName: notification.creator.fullName,
            } : null,
            user: notification.user ? {
                id: notification.user.id.toString(),
                username: notification.user.username,
                fullName: notification.user.fullName,
            } : null,
        };
    }
    async createGlobalNotification(data, req) {
        const notificationData = {
            type: data.type,
            message: data.message,
            createdBy: req.user.id,
        };
        const notification = await this.notificationService.createGlobalNotification(notificationData);
        return {
            id: notification.id.toString(),
            type: notification.type,
            message: notification.message,
            isGlobal: notification.isGlobal,
            createdAt: notification.createdAt,
        };
    }
    async createNotificationForAllUsers(data, req) {
        const notificationData = {
            type: data.type,
            message: data.message,
            createdBy: req.user.id,
        };
        const notifications = await this.notificationService.createNotificationForAllUsers(notificationData);
        return {
            message: `Created ${notifications.length} notifications for all users`,
            count: notifications.length,
        };
    }
    async updateNotification(id, data, req) {
        // Check if notification exists and is global or created by current admin
        const existingNotification = await this.notificationService.getNotificationById(id);
        if (!existingNotification.isGlobal && existingNotification.createdBy !== req.user.id) {
            throw new Error('You can only update global notifications or notifications you created');
        }
        const updateData = {
            type: data.type,
            message: data.message,
        };
        const notification = await this.notificationService.updateNotification(id, updateData);
        return {
            id: notification.id.toString(),
            type: notification.type,
            message: notification.message,
            isGlobal: notification.isGlobal,
            createdAt: notification.createdAt,
        };
    }
    async deleteNotification(id, req) {
        // Check if notification exists and is global or created by current admin
        const existingNotification = await this.notificationService.getNotificationById(id);
        if (!existingNotification.isGlobal && existingNotification.createdBy !== req.user.id) {
            throw new Error('You can only delete global notifications or notifications you created');
        }
        await this.notificationService.deleteNotification(id);
        return { message: 'Notification deleted successfully' };
    }
    async deleteAllGlobalNotifications() {
        await this.notificationService.deleteAllGlobalNotifications();
        return { message: 'All global notifications deleted successfully' };
    }
    async getNotificationStats() {
        const globalCount = await this.notificationService.getGlobalNotificationCount();
        return {
            globalNotifications: globalCount,
            // Add more stats as needed
        };
    }
};
exports.AdminNotificationController = AdminNotificationController;
tslib_1.__decorate([
    (0, common_1.Get)('global'),
    tslib_1.__param(0, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminNotificationController.prototype, "getGlobalNotifications", null);
tslib_1.__decorate([
    (0, common_1.Get)('global/count'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminNotificationController.prototype, "getGlobalNotificationCount", null);
tslib_1.__decorate([
    (0, common_1.Get)(':id'),
    tslib_1.__param(0, (0, common_1.Param)('id', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminNotificationController.prototype, "getNotificationById", null);
tslib_1.__decorate([
    (0, common_1.Post)('global'),
    tslib_1.__param(0, (0, common_1.Body)()),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [CreateGlobalNotificationRequestDto, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminNotificationController.prototype, "createGlobalNotification", null);
tslib_1.__decorate([
    (0, common_1.Post)('global/all-users'),
    tslib_1.__param(0, (0, common_1.Body)()),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [CreateGlobalNotificationRequestDto, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminNotificationController.prototype, "createNotificationForAllUsers", null);
tslib_1.__decorate([
    (0, common_1.Put)(':id'),
    tslib_1.__param(0, (0, common_1.Param)('id', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)()),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, UpdateNotificationRequestDto, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminNotificationController.prototype, "updateNotification", null);
tslib_1.__decorate([
    (0, common_1.Delete)(':id'),
    tslib_1.__param(0, (0, common_1.Param)('id', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminNotificationController.prototype, "deleteNotification", null);
tslib_1.__decorate([
    (0, common_1.Delete)('global/all'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminNotificationController.prototype, "deleteAllGlobalNotifications", null);
tslib_1.__decorate([
    (0, common_1.Get)('stats/overview'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminNotificationController.prototype, "getNotificationStats", null);
exports.AdminNotificationController = AdminNotificationController = tslib_1.__decorate([
    (0, common_1.Controller)('admin/notifications'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, role_guard_1.RolesGuard),
    (0, for_role_decorator_1.ForRoles)(2, 1) // Admin = 2, SuperAdmin = 1
    ,
    (0, common_1.UseInterceptors)(json_serializer_interceptor_1.JsonSerializerInterceptor),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof notification_manager_service_1.NotificationManagerService !== "undefined" && notification_manager_service_1.NotificationManagerService) === "function" ? _a : Object])
], AdminNotificationController);


/***/ }),
/* 156 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectInvitationController = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const jwt_guard_1 = __webpack_require__(56);
const project_invitation_service_1 = __webpack_require__(157);
const project_invitation_dto_1 = __webpack_require__(158);
const bigint_transform_pipe_1 = __webpack_require__(109);
const project_invitation_entity_1 = __webpack_require__(33);
let ProjectInvitationController = class ProjectInvitationController {
    constructor(invitationService) {
        this.invitationService = invitationService;
    }
    async createInvitation(projectId, createInvitationDto, req) {
        const invitation = await this.invitationService.createInvitation(projectId, BigInt(createInvitationDto.invitedUserId), req.user.id, createInvitationDto.message, createInvitationDto.expiresIn);
        return {
            message: 'Invitation sent successfully',
            invitation
        };
    }
    async getProjectInvitations(projectId, req) {
        const invitations = await this.invitationService.getProjectInvitations(projectId);
        return { invitations };
    }
    async getMyInvitations(req, status) {
        const invitations = await this.invitationService.getUserInvitations(req.user.id, status);
        return { invitations };
    }
    async respondToInvitation(invitationId, updateStatusDto, req) {
        const invitation = await this.invitationService.respondToInvitation(invitationId, req.user.id, updateStatusDto.status);
        const message = updateStatusDto.status === project_invitation_entity_1.InvitationStatus.ACCEPTED
            ? 'Invitation accepted successfully'
            : 'Invitation declined successfully';
        return {
            message,
            invitation
        };
    }
    async cancelInvitation(invitationId, req) {
        await this.invitationService.cancelInvitation(invitationId, req.user.id);
        return { message: 'Invitation cancelled successfully' };
    }
};
exports.ProjectInvitationController = ProjectInvitationController;
tslib_1.__decorate([
    (0, common_1.Post)(':projectId/invitations'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)()),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_b = typeof project_invitation_dto_1.CreateProjectInvitationDto !== "undefined" && project_invitation_dto_1.CreateProjectInvitationDto) === "function" ? _b : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectInvitationController.prototype, "createInvitation", null);
tslib_1.__decorate([
    (0, common_1.Get)(':projectId/invitations'),
    tslib_1.__param(0, (0, common_1.Param)('projectId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectInvitationController.prototype, "getProjectInvitations", null);
tslib_1.__decorate([
    (0, common_1.Get)('invitations/my'),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__param(1, (0, common_1.Query)('status')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, typeof (_c = typeof project_invitation_entity_1.InvitationStatus !== "undefined" && project_invitation_entity_1.InvitationStatus) === "function" ? _c : Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectInvitationController.prototype, "getMyInvitations", null);
tslib_1.__decorate([
    (0, common_1.Patch)('invitations/:invitationId/respond'),
    tslib_1.__param(0, (0, common_1.Param)('invitationId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    tslib_1.__param(2, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, typeof (_d = typeof project_invitation_dto_1.UpdateInvitationStatusDto !== "undefined" && project_invitation_dto_1.UpdateInvitationStatusDto) === "function" ? _d : Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectInvitationController.prototype, "respondToInvitation", null);
tslib_1.__decorate([
    (0, common_1.Delete)('invitations/:invitationId'),
    tslib_1.__param(0, (0, common_1.Param)('invitationId', bigint_transform_pipe_1.BigIntTransformPipe)),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [BigInt, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ProjectInvitationController.prototype, "cancelInvitation", null);
exports.ProjectInvitationController = ProjectInvitationController = tslib_1.__decorate([
    (0, common_1.Controller)('projects'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof project_invitation_service_1.ProjectInvitationService !== "undefined" && project_invitation_service_1.ProjectInvitationService) === "function" ? _a : Object])
], ProjectInvitationController);


/***/ }),
/* 157 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f, _g;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectInvitationService = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const typeorm_1 = __webpack_require__(10);
const typeorm_2 = __webpack_require__(15);
const Entities_1 = __webpack_require__(16);
const project_manager_service_1 = __webpack_require__(90);
const notification_gateway_1 = __webpack_require__(95);
const mailer_service_1 = __webpack_require__(83);
const notification_manager_service_1 = __webpack_require__(94);
let ProjectInvitationService = class ProjectInvitationService {
    constructor(invitationRepository, projectRepository, userRepository, projectManagerService, notificationGateway, mailService, notificationManagerService) {
        this.invitationRepository = invitationRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.projectManagerService = projectManagerService;
        this.notificationGateway = notificationGateway;
        this.mailService = mailService;
        this.notificationManagerService = notificationManagerService;
    }
    async createInvitation(projectId, invitedUserId, invitedByUserId, message, expiresIn) {
        try {
            const expiresInDays = expiresIn ? parseInt(expiresIn) : 7;
            console.log('Starting createInvitation with params:', {
                projectId: projectId.toString(),
                invitedUserId: invitedUserId.toString(),
                invitedByUserId: invitedByUserId.toString(),
                message,
                expiresIn: expiresInDays
            });
            // Check if project exists
            const project = await this.projectRepository.findOne({
                where: { id: projectId }
            });
            if (!project) {
                throw new common_1.NotFoundException('Project not found');
            }
            // Check if invited user exists
            const invitedUser = await this.userRepository.findOne({
                where: { id: invitedUserId }
            });
            if (!invitedUser) {
                throw new common_1.NotFoundException('Invited user not found');
            }
            // Check if user is already a member
            const isAlreadyMember = await this.projectManagerService.isUserProjectMember(projectId, invitedUserId);
            if (isAlreadyMember) {
                throw new common_1.BadRequestException('User is already a member of this project');
            }
            // Check if there's already any invitation (pending or not)
            const existingInvitation = await this.invitationRepository.findOne({
                where: {
                    projectId,
                    invitedUserId
                }
            });
            if (existingInvitation) {
                if (existingInvitation.status === Entities_1.InvitationStatus.PENDING) {
                    throw new common_1.BadRequestException('User already has a pending invitation to this project');
                }
                else {
                    // Update existing invitation to PENDING status
                    console.log('Updating existing invitation from status:', existingInvitation.status);
                    existingInvitation.status = Entities_1.InvitationStatus.PENDING;
                    existingInvitation.message = message;
                    existingInvitation.expiresAt = new Date();
                    existingInvitation.expiresAt.setDate(existingInvitation.expiresAt.getDate() + expiresInDays);
                    existingInvitation.invitedByUserId = invitedByUserId;
                    const updatedInvitation = await this.invitationRepository.save(existingInvitation);
                    console.log('Updated invitation:', updatedInvitation);
                    // Note: Removed socket emit to avoid popup notification
                    // Project invitation will only appear in My Notifications page
                    const invitationResponse = this.mapToResponseDto(updatedInvitation);
                    console.log(`📧 Emitting updated_project_invitation to user ${invitedUserId.toString()}:`, invitationResponse);
                    // Send email notification for updated invitation
                    try {
                        // Get inviter's username
                        const inviter = await this.userRepository.findOne({
                            where: { id: invitedByUserId }
                        });
                        console.log('📧 Preparing to send email for updated invitation with data:', {
                            to: invitedUser.email,
                            projectName: project.name,
                            invitedByUsername: inviter?.username || 'Unknown User',
                            message: message,
                            projectId: projectId.toString(),
                            expiresIn: expiresInDays
                        });
                        await this.mailService.sendProjectInvitation(invitedUser.email, {
                            projectName: project.name,
                            invitedByUsername: inviter?.username || 'Unknown User',
                            message: message,
                            projectId: projectId.toString(),
                            expiresIn: expiresInDays
                        });
                        console.log(`📧 Email sent successfully to ${invitedUser.email} for updated project invitation`);
                    }
                    catch (emailError) {
                        console.error('📧 Email send error for updated invitation:', emailError);
                        console.error('📧 Email error stack:', emailError);
                        // Don't fail the invitation update if email fails
                    }
                    // Create notification for updated invitation (for My Notifications page)
                    try {
                        await this.notificationManagerService.notifyUserProjectInvite(invitedUserId, project.name);
                        console.log(`📧 Notification created for updated project invitation to user ${invitedUserId.toString()}`);
                    }
                    catch (notificationError) {
                        console.error('📧 Notification creation error for updated invitation:', notificationError);
                        // Don't fail the invitation update if notification fails
                    }
                    return invitationResponse;
                }
            }
            // Create invitation with custom expiration
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
            console.log('Creating invitation with data:', {
                projectId: projectId.toString(),
                invitedUserId: invitedUserId.toString(),
                invitedByUserId: invitedByUserId.toString(),
                message,
                expiresIn: expiresInDays,
                expiresAt,
                status: Entities_1.InvitationStatus.PENDING
            });
            const invitation = this.invitationRepository.create({
                projectId,
                invitedUserId,
                invitedByUserId,
                message,
                expiresAt,
                status: Entities_1.InvitationStatus.PENDING
            });
            console.log('Created invitation entity:', invitation);
            const savedInvitation = await this.invitationRepository.save(invitation);
            console.log('Saved invitation:', savedInvitation);
            // Note: Removed socket emit to avoid popup notification
            // Project invitation will only appear in My Notifications page
            const invitationResponse = this.mapToResponseDto(savedInvitation);
            console.log(`📧 Emitting new_project_invitation to user ${invitedUserId.toString()}:`, invitationResponse);
            try {
                this.notificationGateway.server.to(`user_${invitedUserId.toString()}`).emit('new_project_invitation', invitationResponse);
            }
            catch (socketError) {
                console.error('Socket emit error:', socketError);
                // Don't fail the invitation creation if socket fails
            }
            // Send email notification
            try {
                // Get inviter's username
                const inviter = await this.userRepository.findOne({
                    where: { id: invitedByUserId }
                });
                console.log('📧 Preparing to send email with data:', {
                    to: invitedUser.email,
                    projectName: project.name,
                    invitedByUsername: inviter?.username || 'Unknown User',
                    message: message,
                    projectId: projectId.toString(),
                    expiresIn: expiresInDays
                });
                await this.mailService.sendProjectInvitation(invitedUser.email, {
                    projectName: project.name,
                    invitedByUsername: inviter?.username || 'Unknown User',
                    message: message,
                    projectId: projectId.toString(),
                    expiresIn: expiresInDays
                });
                console.log(`📧 Email sent successfully to ${invitedUser.email} for project invitation`);
            }
            catch (emailError) {
                console.error('📧 Email send error:', emailError);
                console.error('📧 Email error stack:', emailError);
                // Don't fail the invitation creation if email fails
            }
            // Create notification for new invitation (for My Notifications page)
            try {
                await this.notificationManagerService.notifyUserProjectInvite(invitedUserId, project.name);
                console.log(`📧 Notification created for new project invitation to user ${invitedUserId.toString()}`);
            }
            catch (notificationError) {
                console.error('📧 Notification creation error for new invitation:', notificationError);
                // Don't fail the invitation creation if notification fails
            }
            return invitationResponse;
        }
        catch (error) {
            console.error('Error in createInvitation:', error);
            console.error('Error stack:', error);
            throw error;
        }
    }
    async getUserInvitations(userId, status) {
        const whereCondition = { invitedUserId: userId };
        if (status) {
            whereCondition.status = status;
        }
        const invitations = await this.invitationRepository.find({
            where: whereCondition,
            relations: ['project', 'invitedUser', 'invitedByUser'],
            order: { createdAt: 'DESC' }
        });
        return invitations.map(invitation => this.mapToResponseDto(invitation));
    }
    async getProjectInvitations(projectId) {
        const invitations = await this.invitationRepository.find({
            where: { projectId },
            relations: ['project', 'invitedUser', 'invitedByUser'],
            order: { createdAt: 'DESC' }
        });
        return invitations.map(invitation => this.mapToResponseDto(invitation));
    }
    async respondToInvitation(invitationId, userId, status) {
        const invitation = await this.invitationRepository.findOne({
            where: { id: invitationId },
            relations: ['project', 'invitedUser', 'invitedByUser']
        });
        if (!invitation) {
            throw new common_1.NotFoundException('Invitation not found');
        }
        if (invitation.invitedUserId !== userId) {
            throw new common_1.ForbiddenException('You can only respond to invitations sent to you');
        }
        if (invitation.status !== Entities_1.InvitationStatus.PENDING) {
            throw new common_1.BadRequestException('Invitation has already been responded to');
        }
        if (invitation.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Invitation has expired');
        }
        // Update invitation status
        invitation.status = status;
        const updatedInvitation = await this.invitationRepository.save(invitation);
        // Emit socket event for invitation response
        this.notificationGateway.server.to(`user_${invitation.invitedUserId.toString()}`).emit('invitation_responded', {
            invitationId: invitation.id.toString(),
            status: status
        });
        // If accepted, add user to project
        if (status === Entities_1.InvitationStatus.ACCEPTED) {
            try {
                await this.projectManagerService.addUserToProject(invitation.projectId, invitation.invitedUserId, invitation.invitedByUserId // Using the person who sent the invitation as the one performing the action
                );
            }
            catch (error) {
                // If adding to project fails, revert invitation status
                invitation.status = Entities_1.InvitationStatus.PENDING;
                await this.invitationRepository.save(invitation);
                throw error;
            }
        }
        return this.mapToResponseDto(updatedInvitation);
    }
    async cancelInvitation(invitationId, userId) {
        const invitation = await this.invitationRepository.findOne({
            where: { id: invitationId },
            relations: ['project']
        });
        if (!invitation) {
            throw new common_1.NotFoundException('Invitation not found');
        }
        // Only the person who sent the invitation or project owner can cancel it
        const project = await this.projectRepository.findOne({
            where: { id: invitation.projectId },
            relations: ['createdBy']
        });
        if (invitation.invitedByUserId !== userId &&
            project?.createdBy?.id !== userId) {
            throw new common_1.ForbiddenException('You can only cancel invitations you sent');
        }
        if (invitation.status !== Entities_1.InvitationStatus.PENDING) {
            throw new common_1.BadRequestException('Can only cancel pending invitations');
        }
        invitation.status = Entities_1.InvitationStatus.DECLINED;
        await this.invitationRepository.save(invitation);
    }
    async cleanupExpiredInvitations() {
        const expiredInvitations = await this.invitationRepository
            .createQueryBuilder('invitation')
            .where('invitation.status = :status', { status: Entities_1.InvitationStatus.PENDING })
            .andWhere('invitation.expiresAt < :now', { now: new Date() })
            .getMany();
        for (const invitation of expiredInvitations) {
            invitation.status = Entities_1.InvitationStatus.EXPIRED;
            await this.invitationRepository.save(invitation);
        }
    }
    mapToResponseDto(invitation) {
        return {
            id: invitation.id.toString(),
            projectId: invitation.projectId.toString(),
            invitedUserId: invitation.invitedUserId.toString(),
            invitedByUserId: invitation.invitedByUserId.toString(),
            status: invitation.status,
            message: invitation.message,
            expiresAt: invitation.expiresAt.toISOString(),
            createdAt: invitation.createdAt.toISOString(),
            updatedAt: invitation.updatedAt.toISOString(),
            project: invitation.project ? {
                id: invitation.project.id.toString(),
                name: invitation.project.name,
                description: invitation.project.description
            } : undefined,
            invitedUser: invitation.invitedUser ? {
                id: invitation.invitedUser.id.toString(),
                fullName: invitation.invitedUser.fullName,
                email: invitation.invitedUser.email,
                username: invitation.invitedUser.username
            } : undefined,
            invitedByUser: invitation.invitedByUser ? {
                id: invitation.invitedByUser.id.toString(),
                fullName: invitation.invitedByUser.fullName,
                email: invitation.invitedByUser.email,
                username: invitation.invitedByUser.username
            } : undefined
        };
    }
};
exports.ProjectInvitationService = ProjectInvitationService;
exports.ProjectInvitationService = ProjectInvitationService = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, typeorm_1.InjectRepository)(Entities_1.ProjectInvitationEntity)),
    tslib_1.__param(1, (0, typeorm_1.InjectRepository)(Entities_1.ProjectEntity)),
    tslib_1.__param(2, (0, typeorm_1.InjectRepository)(Entities_1.UserEntity)),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof project_manager_service_1.ProjectManagerService !== "undefined" && project_manager_service_1.ProjectManagerService) === "function" ? _d : Object, typeof (_e = typeof notification_gateway_1.NotificationGateway !== "undefined" && notification_gateway_1.NotificationGateway) === "function" ? _e : Object, typeof (_f = typeof mailer_service_1.MailService !== "undefined" && mailer_service_1.MailService) === "function" ? _f : Object, typeof (_g = typeof notification_manager_service_1.NotificationManagerService !== "undefined" && notification_manager_service_1.NotificationManagerService) === "function" ? _g : Object])
], ProjectInvitationService);


/***/ }),
/* 158 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectInvitationResponseDto = exports.UpdateInvitationStatusDto = exports.CreateProjectInvitationDto = void 0;
const tslib_1 = __webpack_require__(1);
const class_validator_1 = __webpack_require__(7);
const Entities_1 = __webpack_require__(16);
class CreateProjectInvitationDto {
}
exports.CreateProjectInvitationDto = CreateProjectInvitationDto;
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateProjectInvitationDto.prototype, "invitedUserId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateProjectInvitationDto.prototype, "message", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    tslib_1.__metadata("design:type", String)
], CreateProjectInvitationDto.prototype, "expiresIn", void 0);
class UpdateInvitationStatusDto {
}
exports.UpdateInvitationStatusDto = UpdateInvitationStatusDto;
tslib_1.__decorate([
    (0, class_validator_1.IsEnum)(Entities_1.InvitationStatus),
    tslib_1.__metadata("design:type", typeof (_a = typeof Entities_1.InvitationStatus !== "undefined" && Entities_1.InvitationStatus) === "function" ? _a : Object)
], UpdateInvitationStatusDto.prototype, "status", void 0);
class ProjectInvitationResponseDto {
}
exports.ProjectInvitationResponseDto = ProjectInvitationResponseDto;


/***/ }),
/* 159 */
/***/ ((module) => {

module.exports = require("@nestjs-modules/mailer/dist/adapters/handlebars.adapter");

/***/ }),
/* 160 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatModule = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const chat_gateway_1 = __webpack_require__(161);
const chat_service_1 = __webpack_require__(84);
const mongoose_1 = __webpack_require__(41);
const chat_message_schema_1 = __webpack_require__(85);
const chat_room_schema_1 = __webpack_require__(86);
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = tslib_1.__decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: chat_message_schema_1.ChatMessage.name, schema: chat_message_schema_1.ChatMessageSchema },
                { name: chat_room_schema_1.ChatRoom.name, schema: chat_room_schema_1.ChatRoomSchema },
            ]),
        ],
        providers: [chat_gateway_1.ChatGateway, chat_service_1.ChatService],
    })
], ChatModule);


/***/ }),
/* 161 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


var _a, _b, _c, _d, _e, _f, _g, _h;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatGateway = void 0;
const tslib_1 = __webpack_require__(1);
const websockets_1 = __webpack_require__(96);
const socket_io_1 = __webpack_require__(97);
const chat_service_1 = __webpack_require__(84);
const user_manager_service_1 = __webpack_require__(87);
let ChatGateway = class ChatGateway {
    constructor(chatService, userService) {
        this.chatService = chatService;
        this.userService = userService;
    }
    handleConnection(client) {
        console.log(`✅ Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        console.log(`❌ Client disconnected: ${client.id}`);
    }
    async handleJoinRoom(roomId, client) {
        console.log(`👥 Client ${client.id} joining room: ${roomId}`);
        client.join(roomId);
        client.emit('joined_room', roomId);
    }
    async handleSendMessage(payload, client) {
        console.log('[GATEWAY] 📩 Received payload:', payload);
        const savedDoc = await this.chatService.createMessage(payload);
        let senderUsername = 'Unknown';
        try {
            const users = await this.userService.findUsersByIds([payload.senderId]);
            if (users && users.length > 0) {
                senderUsername = users[0].username;
            }
        }
        catch (err) {
            console.error('⚠️ Failed to fetch username:', err);
        }
        const plain = savedDoc.toObject();
        let replyToData = null;
        if (plain.replyTo) {
            const repliedDoc = await this.chatService.findMessageById(plain.replyTo.toString());
            if (repliedDoc) {
                replyToData = {
                    _id: repliedDoc._id.toString(),
                    message: repliedDoc.message,
                    senderId: repliedDoc.senderId,
                    senderUsername: repliedDoc.senderUsername,
                };
            }
        }
        const messageWithUsername = {
            _id: plain._id.toString(),
            roomId: plain.roomId.toString(),
            senderId: plain.senderId,
            message: plain.message,
            createdAt: plain.createdAt,
            isEdited: plain.isEdited ?? false,
            senderUsername,
            replyTo: replyToData,
            fileUrl: plain.fileUrl,
            fileName: plain.fileName,
        };
        this.server.to(payload.roomId).emit('new_message', messageWithUsername);
        return messageWithUsername;
    }
    async handleEditMessage(data, client) {
        console.log('[GATEWAY] ✏️ Edit request:', data);
        const updated = await this.chatService.editMessage(data.messageId, data.newContent);
        // Broadcast the edited message to all clients in the room
        this.server.to(updated.roomId.toString()).emit('message_edited', {
            _id: updated._id.toString(),
            roomId: updated.roomId.toString(),
            message: updated.message,
            isEdited: true,
            senderId: updated.senderId,
            createdAt: updated.createdAt
        });
        return updated;
    }
    async handleDeleteMessage(data, client) {
        console.log('[GATEWAY] 🗑️ Delete request:', data);
        await this.chatService.deleteMessage(data.messageId);
        // Broadcast deleted message ID to everyone in the room
        this.server.to(data.roomId).emit('message_deleted', data.messageId);
        return { deleted: true, _id: data.messageId };
    }
};
exports.ChatGateway = ChatGateway;
tslib_1.__decorate([
    (0, websockets_1.WebSocketServer)(),
    tslib_1.__metadata("design:type", typeof (_c = typeof socket_io_1.Server !== "undefined" && socket_io_1.Server) === "function" ? _c : Object)
], ChatGateway.prototype, "server", void 0);
tslib_1.__decorate([
    (0, websockets_1.SubscribeMessage)('join_room'),
    tslib_1.__param(0, (0, websockets_1.MessageBody)()),
    tslib_1.__param(1, (0, websockets_1.ConnectedSocket)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, typeof (_d = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _d : Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinRoom", null);
tslib_1.__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    tslib_1.__param(0, (0, websockets_1.MessageBody)()),
    tslib_1.__param(1, (0, websockets_1.ConnectedSocket)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, typeof (_f = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _f : Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
tslib_1.__decorate([
    (0, websockets_1.SubscribeMessage)('edit_message'),
    tslib_1.__param(0, (0, websockets_1.MessageBody)()),
    tslib_1.__param(1, (0, websockets_1.ConnectedSocket)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, typeof (_g = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _g : Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleEditMessage", null);
tslib_1.__decorate([
    (0, websockets_1.SubscribeMessage)('delete_message'),
    tslib_1.__param(0, (0, websockets_1.MessageBody)()),
    tslib_1.__param(1, (0, websockets_1.ConnectedSocket)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, typeof (_h = typeof socket_io_1.Socket !== "undefined" && socket_io_1.Socket) === "function" ? _h : Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleDeleteMessage", null);
exports.ChatGateway = ChatGateway = tslib_1.__decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/chat',
        path: '/api/chat/socket.io',
        cors: {
            origin: [
                'http://localhost:4200', // Always allow localhost for development
                process.env.CLIENT_URL || 'http://localhost:4200',
                process.env.PRODUCTION_URL || 'https://htt-ekpa.onrender.com',
            ],
            credentials: true,
            methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
    }),
    tslib_1.__metadata("design:paramtypes", [typeof (_a = typeof chat_service_1.ChatService !== "undefined" && chat_service_1.ChatService) === "function" ? _a : Object, typeof (_b = typeof user_manager_service_1.UserManagerService !== "undefined" && user_manager_service_1.UserManagerService) === "function" ? _b : Object])
], ChatGateway);


/***/ }),
/* 162 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BigIntSerializerInterceptor = void 0;
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const operators_1 = __webpack_require__(163);
let BigIntSerializerInterceptor = class BigIntSerializerInterceptor {
    intercept(context, next) {
        return next.handle().pipe((0, operators_1.map)(data => this.transformBigInt(data, new WeakSet())));
    }
    transformBigInt(data, seen) {
        if (data === null || data === undefined) {
            return data;
        }
        if (typeof data === 'bigint') {
            return data.toString();
        }
        if (Array.isArray(data)) {
            return data.map(item => this.transformBigInt(item, seen));
        }
        if (typeof data === 'object') {
            if (seen.has(data)) {
                return '[Circular]';
            }
            seen.add(data);
            const transformed = {};
            for (const [key, value] of Object.entries(data)) {
                transformed[key] = this.transformBigInt(value, seen);
            }
            return transformed;
        }
        return data;
    }
};
exports.BigIntSerializerInterceptor = BigIntSerializerInterceptor;
exports.BigIntSerializerInterceptor = BigIntSerializerInterceptor = tslib_1.__decorate([
    (0, common_1.Injectable)()
], BigIntSerializerInterceptor);


/***/ }),
/* 163 */
/***/ ((module) => {

module.exports = require("rxjs/operators");

/***/ }),
/* 164 */
/***/ ((module) => {

module.exports = require("cookie-parser");

/***/ }),
/* 165 */
/***/ ((module) => {

module.exports = require("express");

/***/ }),
/* 166 */
/***/ ((module) => {

module.exports = require("@octokit/rest");

/***/ }),
/* 167 */
/***/ ((module) => {

module.exports = require("docx");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			var def = {};
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; typeof current == 'object' && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 			}
/******/ 			def['default'] = () => (value);
/******/ 			__webpack_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const core_1 = __webpack_require__(3);
const main_module_1 = __webpack_require__(4);
const common_2 = __webpack_require__(21);
const bigint_serializer_interceptor_1 = __webpack_require__(162);
const cookie_parser_1 = tslib_1.__importDefault(__webpack_require__(164));
const path_1 = __webpack_require__(103);
const express = tslib_1.__importStar(__webpack_require__(165));
async function bootstrap() {
    try {
        (0, common_2.shared)();
        const app = await core_1.NestFactory.create(main_module_1.MainModule);
        app.use((0, cookie_parser_1.default)());
        app.use('/uploads', express.static((0, path_1.join)(__dirname, '..', '..', '..', 'uploads')));
        app.useGlobalPipes(new common_1.ValidationPipe({ enableDebugMessages: true }));
        app.useGlobalInterceptors(new bigint_serializer_interceptor_1.BigIntSerializerInterceptor());
        app.enableCors({
            origin: [
                'http://localhost:4200',
                process.env.CLIENT_URL || 'https://heretotranslate.onrender.com',
                process.env.PRODUCTION_URL || 'https://htt-ekpa.onrender.com',
                'https://heretotranslate.onrender.com',
            ],
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            credentials: true,
        });
        const globalPrefix = 'api';
        app.setGlobalPrefix(globalPrefix);
        const port = process.env.PORT ? Number(process.env.PORT) : 3000;
        await app.listen(port, '0.0.0.0');
        common_1.Logger.log(`🚀 Application is running on: http://localhost:${port}`);
    }
    catch (err) {
        console.error('❌ Application failed to start', err);
        process.exit(1);
    }
}
bootstrap();

})();

/******/ })()
;
//# sourceMappingURL=main.js.map
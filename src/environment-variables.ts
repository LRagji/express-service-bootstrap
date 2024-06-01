
/**
 * EnvironmentVariables class is a wrapper around NodeJS.ProcessEnv to provide type-safe access to environment variables.
 */
export class EnvironmentVariables {

    /**
     * Creates a new instance of EnvironmentVariables.
     * @param env The NodeJS.ProcessEnv object.
     * @returns A new instance of EnvironmentVariables.
     */
    constructor(private readonly env: NodeJS.ProcessEnv = process.env) { }

    /**
     * Gets the value of the environment variable.
     * @param key The key of the environment variable.
     * @returns The value of the environment variable or undefined.
     */
    public getString(key: string): string | undefined {
        return this.env[key];
    }

    /**
     * Gets the value of the environment variable or the default value if the environment variable is not set.
     * @param key The key of the environment variable.
     * @param defaultValue The default value to return if the environment variable is not set.
     * @returns The value of the environment variable or the default value.
     */
    public getStringOrDefault(key: string, defaultValue: string): string {
        return this.env[key] || defaultValue;
    }

    /**
     * Gets the value of the environment variable as a number.
     * @param key The key of the environment variable.
     * @param defaultValue The default value to return if the environment variable is not set.
     * @returns The value of the environment variable as a number or the default value.
     */
    public getNumber(key: string, defaultValue: number): number {
        const value = this.getString(key);
        return value === undefined ? defaultValue : parseInt(value, 10);
    }

    /**
     * Gets the value of the environment variable as a boolean.
     * @param key The key of the environment variable.
     * @param defaultValue The default value to return if the environment variable is not set.
     * @returns The value of the environment variable as a boolean or the default value.
     */
    public getBoolean(key: string, defaultValue: boolean): boolean {
        const value = this.getString(key);
        return value === undefined ? defaultValue : value === 'true';
    }

    /**
     * Gets the value of the environment variable as an array.
     * @param key The key of the environment variable.
     * @param defaultValue The default value to return if the environment variable is not set.
     * @returns The value of the environment variable as an array or the default value.
     */
    public getArray<T>(key: string, defaultValue: Array<T>): Array<T> {
        const value = this.getString(key);
        return value === undefined ? defaultValue : JSON.parse(value);
    }

    /**
     * Gets the value of the environment variable as an object.
     * @param key The key of the environment variable.
     * @param defaultValue The default value to return if the environment variable is not set.
     * @returns The value of the environment variable as an object or the default value.
     */
    public getObject<T>(key: string, defaultValue: T): T {
        const value = this.getString(key);
        return value === undefined ? defaultValue : JSON.parse(value);
    }
}
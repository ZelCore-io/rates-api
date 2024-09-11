import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";

/**
 * A wrapper around Axios to handle automatic retries and customizable configurations.
 */
export class AxiosWrapper {
    private axiosInstance: AxiosInstance;
    private maxRetries: number;
    private timeout: number;

    /**
     * Creates an instance of AxiosWrapper.
     *
     * @param {string} baseURL - The base URL for all requests.
     * @param {number} [maxRetries=3] - The maximum number of retry attempts for failed requests.
     * @param {number} [timeout=5000] - The timeout in milliseconds for requests.
     */
    constructor(baseURL: string, maxRetries: number = 3, timeout: number = 5000) {
        this.maxRetries = maxRetries;
        this.timeout = timeout;

        this.axiosInstance = axios.create({
            baseURL,
            timeout: this.timeout,
        });

        this.initializeInterceptors();
    }

    /**
     * Initializes response interceptors to handle retries for failed requests.
     *
     * @private
     */
    private initializeInterceptors() {
        this.axiosInstance.interceptors.response.use(
            response => response,
            (error: AxiosError) => this.handleRetry(error)
        );
    }

    /**
     * Handles retry logic for failed requests.
     *
     * @private
     * @param {AxiosError} error - The error received from a failed request.
     * @returns {Promise<any>} A promise that resolves or rejects based on retry attempts.
     */
    private async handleRetry(error: AxiosError): Promise<any> {
        const config = error.config as AxiosRequestConfig & { __retryCount?: number };

        // Check if retry has been initialized
        if (!config.__retryCount) {
            config.__retryCount = 0;
        }

        // If max retries have not been met, retry the request
        if (config.__retryCount < this.maxRetries) {
            config.__retryCount += 1;
            return new Promise((resolve) =>
                setTimeout(() => resolve(this.axiosInstance(config)), 1000)
            );
        }

        // If max retries exceeded, reject the promise
        return Promise.reject(error);
    }

    /**
     * Performs a GET request.
     *
     * @param {string} url - The URL to send the GET request to.
     * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
     * @returns {Promise<any>} The response from the GET request.
     */
    public async get(url: string, config?: AxiosRequestConfig) {
        return this.axiosInstance.get(url, config);
    }

    /**
     * Performs a POST request.
     *
     * @param {string} url - The URL to send the POST request to.
     * @param {any} [data] - The data to send with the POST request.
     * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
     * @returns {Promise<any>} The response from the POST request.
     */
    public async post(url: string, data?: any, config?: AxiosRequestConfig) {
        return this.axiosInstance.post(url, data, config);
    }

    /**
     * Performs a PUT request.
     *
     * @param {string} url - The URL to send the PUT request to.
     * @param {any} [data] - The data to send with the PUT request.
     * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
     * @returns {Promise<any>} The response from the PUT request.
     */
    public async put(url: string, data?: any, config?: AxiosRequestConfig) {
        return this.axiosInstance.put(url, data, config);
    }

    /**
     * Performs a DELETE request.
     *
     * @param {string} url - The URL to send the DELETE request to.
     * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
     * @returns {Promise<any>} The response from the DELETE request.
     */
    public async delete(url: string, config?: AxiosRequestConfig) {
        return this.axiosInstance.delete(url, config);
    }
}

export default AxiosWrapper;
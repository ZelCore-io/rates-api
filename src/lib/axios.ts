import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";

/**
 * A wrapper around Axios to handle automatic retries and customizable configurations.
 *
 * This class provides a simplified interface over Axios, adding automatic retry functionality
 * for failed requests, and allowing customization of retry logic and request timeouts.
 *
 * @example
 * ```typescript
 * import AxiosWrapper from './AxiosWrapper';
 *
 * const apiClient = new AxiosWrapper('https://api.example.com', 5, 10000);
 *
 * // Performing a GET request
 * apiClient.get('/users')
 *   .then(response => console.log(response.data))
 *   .catch(error => console.error(error));
 *
 * // Performing a POST request
 * apiClient.post('/users', { name: 'John Doe' })
 *   .then(response => console.log(response.data))
 *   .catch(error => console.error(error));
 * ```
 */
export class AxiosWrapper {
    private axiosInstance: AxiosInstance;
    private maxRetries: number;
    private timeout: number;

    /**
     * Creates an instance of AxiosWrapper.
     *
     * @param baseURL - The base URL for all requests.
     * @param maxRetries - The maximum number of retry attempts for failed requests (default is 3).
     * @param timeout - The timeout in milliseconds for requests (default is 5000 ms).
     *
     * @example
     * ```typescript
     * const apiClient = new AxiosWrapper('https://api.example.com', 5, 10000);
     * ```
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
     * This method sets up an interceptor that listens for response errors
     * and triggers the retry logic if applicable.
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
     * If a request fails, this method checks if the maximum number of retries
     * has been reached. If not, it retries the request after a delay.
     *
     * @private
     * @param error - The error received from a failed request.
     * @returns A promise that resolves with the retried request or rejects with the error.
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
            // Delay before retrying
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
     * @param url - The URL to send the GET request to.
     * @param config - Optional Axios request configuration.
     * @returns The response from the GET request.
     *
     * @example
     * ```typescript
     * apiClient.get('/users')
     *   .then(response => console.log(response.data))
     *   .catch(error => console.error(error));
     * ```
     */
    public async get(url: string, config?: AxiosRequestConfig) {
        return this.axiosInstance.get(url, config);
    }

    /**
     * Performs a POST request.
     *
     * @param url - The URL to send the POST request to.
     * @param data - The data to send with the POST request.
     * @param config - Optional Axios request configuration.
     * @returns The response from the POST request.
     *
     * @example
     * ```typescript
     * apiClient.post('/users', { name: 'John Doe' })
     *   .then(response => console.log(response.data))
     *   .catch(error => console.error(error));
     * ```
     */
    public async post(url: string, data?: any, config?: AxiosRequestConfig) {
        return this.axiosInstance.post(url, data, config);
    }

    /**
     * Performs a PUT request.
     *
     * @param url - The URL to send the PUT request to.
     * @param data - The data to send with the PUT request.
     * @param config - Optional Axios request configuration.
     * @returns The response from the PUT request.
     *
     * @example
     * ```typescript
     * apiClient.put('/users/123', { name: 'Jane Doe' })
     *   .then(response => console.log(response.data))
     *   .catch(error => console.error(error));
     * ```
     */
    public async put(url: string, data?: any, config?: AxiosRequestConfig) {
        return this.axiosInstance.put(url, data, config);
    }

    /**
     * Performs a DELETE request.
     *
     * @param url - The URL to send the DELETE request to.
     * @param config - Optional Axios request configuration.
     * @returns The response from the DELETE request.
     *
     * @example
     * ```typescript
     * apiClient.delete('/users/123')
     *   .then(response => console.log(response.data))
     *   .catch(error => console.error(error));
     * ```
     */
    public async delete(url: string, config?: AxiosRequestConfig) {
        return this.axiosInstance.delete(url, config);
    }
}

export default AxiosWrapper;

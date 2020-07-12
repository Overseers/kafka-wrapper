import kafka from 'kafka-node';
import { WrapperOptions } from './Types';

export default class ConsumerGroup {
    options: WrapperOptions;
    consumer: kafka.ConsumerGroup;
    callbacks: Array<<T extends {}>(message: T) => void> = [];
    filters: Array<(messageValue: any) => boolean> = [];
    processValue: <T extends {}>(message: kafka.Message) => T;
    queue: kafka.Message[] = [];
    processing: boolean = false;

    constructor(options: WrapperOptions, consumerOptions: kafka.ConsumerGroupOptions, topics: string | string[]) {
        this.options = options;
        this.consumer = new kafka.ConsumerGroup(consumerOptions, topics);
        this.consumer.on('message', this.handleConsumption);
    }

    addFilters = (filters: Array<(message: {}) => boolean>): number[] => {
        let indexes: number[] = [];
        filters.forEach(filter => indexes = [...indexes, this.filters.push(filter) - 1]);
        return indexes;
    };

    addCallbacks = (callbacks: Array<(message: {}) => void>): number[] => {
        let indexes: number[] = [];
        callbacks.forEach(callback => indexes = [...indexes, this.callbacks.push(callback) - 1]);
        return indexes;
    };

    handleConsumption = (message: kafka.Message) => {
        if (this.options.pause && this.queue.length > this.options.max) {
            this.consumer.pause();
        }

        this.queue.push(message);

        if (!this.processing) {
            this.processQueue();
        }
    };

    processQueue = () => {
        if (this.queue.length > 0) {
            this.processing = true;
            let message = this.queue.shift();
            Promise.all(
                this.filters.map(filter => {
                    return new Promise((resolve, reject) => {
                        let result = filter(message.value);
                        result ? resolve() : reject();
                    })
                })
            )
                .then(() => {
                    this.callbacks.forEach(callback => {
                        callback(this.processValue(message))
                    })
                })
                .catch(() => {

                });
        } else {
            this.processing = false;
        }
    };
}

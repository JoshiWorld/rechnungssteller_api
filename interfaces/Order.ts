import { User } from './User';
import { Article } from './Article';

export interface Order {
    id: number;
    title: string;
    invoice: string;
    user: User;
    paid: boolean;
    uuid: string;
    articles: Article[];
}
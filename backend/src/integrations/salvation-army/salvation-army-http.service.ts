import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosStatic } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { load } from 'cheerio';

interface WonItem {
  invoiceId: string;
  listingId: string;
  listingUrl: string;
  title: string;
  quantity: number;
  price: number;
}

@Injectable()
export class SalvationArmyHttpService {
  private readonly logger = new Logger(SalvationArmyHttpService.name);
  private readonly options: {
    baseUrl: string;
    loginPath: string;
    invoicesUrl: string;
    wonUrl: string;
    listingBaseUrl: string;
  };

  constructor(private readonly configService: ConfigService) {
    const opts = this.configService.get('integrations.salvationArmy') ?? {};
    this.options = {
      baseUrl: opts.baseUrl ?? 'https://www.shopthesalvationarmy.com',
      loginPath: opts.loginPath ?? '/Account/LogOn',
      invoicesUrl: opts.invoicesUrl ?? '/Account/Invoices',
      wonUrl: opts.wonUrl ?? '/Account/Won',
      listingBaseUrl: opts.listingBaseUrl ?? opts.baseUrl ?? 'https://www.shopthesalvationarmy.com',
    };
  }

  async fetchInvoices(username: string, password: string) {
    const client = await this.createAuthenticatedClient(username, password);
    if (!client) return [];

    const invoiceListHtml = await this.getHtml(client, this.options.invoicesUrl);
    const invoiceLinks = this.parseInvoiceLinks(invoiceListHtml);

    const wonHtml = await this.getHtml(client, this.options.wonUrl);
    const wonItems = this.parseWonItems(wonHtml);

    const invoices: { invoiceId: string; html: string }[] = [];
    for (const invoice of invoiceLinks) {
      const html = await this.getHtml(client, invoice.href);
      invoices.push({ invoiceId: invoice.invoiceId, html });
    }

    return { invoices, wonItems };
  }

  private async createAuthenticatedClient(username: string, password: string): Promise<AxiosInstance | null> {
    const jar = new CookieJar();
    const baseClient = axios as AxiosStatic;
    const wrapped = wrapper(baseClient);
    const client = wrapped.create({
      baseURL: this.options.baseUrl,
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ResaleTracker/1.0)',
      },
      withCredentials: true,
    });
    (client.defaults as any).jar = jar;

    try {
      await client.get(this.options.loginPath);
      const response = await client.post(
        this.options.loginPath,
        new URLSearchParams({
          UserName: username,
          Password: password,
          RememberMe: 'true',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: `${this.options.baseUrl}${this.options.loginPath}`,
          },
          maxRedirects: 0,
          validateStatus: (status) => status === 302 || status === 200,
        },
      );

      if (response.status !== 302) {
        this.logger.warn('Salvation Army login did not redirect; status {status}', response.status);
      }

      return client;
    } catch (error) {
      this.logger.error(`Salvation Army login failed: ${(error as Error).message}`);
      return null;
    }
  }

  private async getHtml(client: AxiosInstance, path: string) {
    const response = await client.get(path, { responseType: 'text' });
    return response.data as string;
  }

  private parseInvoiceLinks(html: string) {
    const $ = load(html);
    const links: { invoiceId: string; href: string }[] = [];
    $('a[href*="/Account/Invoice/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const match = href.match(/Invoice\/(\d+)/i);
      if (match) {
        links.push({ invoiceId: match[1], href });
      }
    });
    return links;
  }

  private parseWonItems(html: string): WonItem[] {
    const $ = load(html);
    const items: WonItem[] = [];
    $('.won-item').each((_, el) => {
      const invoiceId = $(el).attr('data-invoice-id') ?? '';
      const listingId = $(el).attr('data-listing-id') ?? '';
      const listingUrl = $(el).find('a').attr('href') ?? '';
      const title = $(el).find('.item-title').text().trim();
      const quantity = Number.parseInt($(el).find('.item-quantity').text().trim(), 10) || 1;
      const price =
        Number.parseFloat($(el).find('.item-price').text().replace(/[$,]/g, '')) || 0;

      if (invoiceId && listingId) {
        items.push({ invoiceId, listingId, listingUrl, title, quantity, price });
      }
    });
    return items;
  }
}

/*
 * NODE SDK for the KATANA(tm) Framework (http://katana.kusanagi.io)
 * Copyright (c) 2016-2018 KUSANAGI S.L. All rights reserved.
 *
 * Distributed under the MIT license
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code
 *
 * @link      https://github.com/kusanagi/katana-sdk-node
 * @license   http://www.opensource.org/licenses/mit-license.php MIT License
 * @copyright Copyright (c) 2016-2018 KUSANAGI S.L. (http://kusanagi.io)
 */

'use strict';

const _ = require('lodash');
const HttpRequest = require('./http-request');
const HttpResponse = require('./http-response');
const ServiceCall = require('./service-call');
const File = require('./file');
const Transport = require('./transport');
const m = require('./mappings');

class Mapper {
  constructor(options) {
    const defaults = {compact: true};
    const compact = (c) => () => c;
    const extended = (c, e) => () => e;

    this.options = Object.assign({}, defaults, options);

    const get = this.options.compact ? compact : extended;

    this._mappings = {};
    _.forIn(m, (c, e) =>
      Object.defineProperty(this._mappings, e, {get: get(c, e)})
    );
  }

  /**
   *
   * @param {Request} requestApi
   * @returns {Object}
   */
  getRequestMessage(requestApi) {

    return {
      [m.command_reply]: {
        [m.name]: requestApi.getName(),
        [m.result]: {
          [m.call]: {
            [m.service]: requestApi.getServiceName(),
            [m.version]: requestApi.getServiceVersion(),
            [m.action]: requestApi.getActionName(),
            [m.params]: requestApi.getParams().map((p) => ({
                [m.type]: p.getType(),
                [m.value]: p.getValue(),
                [m.name]: p.getName(),
              }
            )),
          },
          [m.attributes]: requestApi._attributes || {}
        }
      }
    };
  }


  /**
   *
   * @param {Response} responseApi
   * @returns {Object}
   */
  getResponseMessage(responseApi) {
    const httpResponse = responseApi.getHttpResponse();

    let payload = {
      [m.command_reply]: {
        [m.name]: responseApi.getName(),
        [m.result]: {
          [m.response]: {
            [m.version]: httpResponse.getProtocolVersion(),
            [m.status]: httpResponse.getStatus(),
            [m.headers]: httpResponse.getHeaders(),
            [m.body]: httpResponse.getBody(),
          }
        }
      }
    };
    if (responseApi.hasReturn()) {
      payload[m.command_reply][m.result][m.response_return] = responseApi._getReturnType();
    }
    return payload;
  }


  /**
   *
   * @param {Action} actionApi
   * @returns {Object}
   */
  getActionMessage(actionApi) {
    return {
      [m.command_reply]: {
        [m.name]: actionApi.getName(),
        [m.result]: {
          [m.transport]: this.getTransportMessage(actionApi.getTransport())
        }
      }
    };
  }

  /**
   *
   * @param {Object} data
   * @returns {HttpRequest}
   */
  getHttpRequest(data) {
    // const requestData = data[m.command][m.arguments][m.request];

    const httpRequestData = {
      version: data[m.version],
      method: data[m.method],
      url: data[m.url]
    };

    if (_.has(data, m.query)) {
      httpRequestData.query = data[m.query];
    }

    if (_.has(data, m.post_data)) {
      httpRequestData.postData = data[m.post_data];
    }

    if (_.has(data, m.headers)) {
      httpRequestData.headers = data[m.headers];
    }

    if (_.has(data, m.body)) {
      httpRequestData.body = data[m.body];
    }

    if (_.has(data, m.files)) {
      httpRequestData.files = data[m.files].map((fileData) => new File(
        fileData[m.name],
        fileData[m.path],
        fileData[m.mime],
        fileData[m.filename],
        fileData[m.size],
        fileData[m.token]
      ));
    }

    return new HttpRequest(httpRequestData);
  }

  getHttpResponse(data) {

    if (!data) {
      throw new Error('Cannot get HTTP response without data');
    }

    const httpResponseData = {
      version: data[m.version],
      status: data[m.status]
    };

    if (_.has(data, m.body)) {
      httpResponseData.body = data[m.body];
    }

    if (_.has(data, m.headers)) {
      httpResponseData.headers = data[m.headers];
    }

    return new HttpResponse(httpResponseData);
  }

  getServiceCall(data) {
    // const callData = data[m.command][m.arguments][m.call];

    return new ServiceCall(
      data[m.service],
      data[m.version],
      data[m.action],
      data[m.params]
    );
  }

  getTransport(data) {
    if (!data) {
      throw new Error('Cannot create a Transport without data');
    }

    return new Transport(data);
  }

  getTransportMessage(transport) {
    const transportMessage = {
      [m.meta]: transport._getMeta()
    };

    if (transport.hasFiles()) {
      transportMessage[m.files] = transport.getFiles();
    }

    if (transport.hasData()) {
      transportMessage[m.data] = transport._getRawData();
    }

    if (transport.hasRelations()) {
      transportMessage[m.relations] = transport._getRawRelations();
    }

    if (transport.hasLinks()) {
      transportMessage[m.links] = transport._getRawLinks();
    }

    if (transport.hasCalls()) {
      transportMessage[m.calls] = transport._getRawCalls();
    }

    if (transport.getTransactions()) {
      transportMessage[m.transactions] = transport._getRawTransactions();
    }

    if (transport.getErrors()) {
      transportMessage[m.errors] = transport._getRawErrors();
    }

    if (transport.hasBody()) {
      transportMessage[m.body] = transport.getBody();
    }

    return transportMessage;
  }
}

module.exports = Mapper;

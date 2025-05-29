import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding requests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('GET requests', () => {
    it('should make a GET request to the correct URL with default headers', (done) => {
      const testPath = '/test-path';
      const mockResponse = { data: 'test data' };

      service.get(testPath).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${testPath}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.headers.get('Accept')).toBe('application/json');
      req.flush(mockResponse);
    });

    it('should make a GET request with HttpParams', (done) => {
      const testPath = '/test-path-params';
      const mockResponse = { data: 'param data' };
      const params = new HttpParams().set('param1', 'value1').set('param2', 'value2');

      service.get(testPath, params).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${testPath}?param1=value1&param2=value2`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('param1')).toBe('value1');
      expect(req.request.params.get('param2')).toBe('value2');
      req.flush(mockResponse);
    });
  });

  describe('PUT requests', () => {
    it('should make a PUT request to the correct URL with body and default headers', (done) => {
      const testPath = '/test-put';
      const mockBody = { data: 'put data' };
      const mockResponse = { success: true };

      service.put(testPath, mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${testPath}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.headers.get('Accept')).toBe('application/json');
      expect(req.request.body).toEqual(mockBody);
      req.flush(mockResponse);
    });
  });

  describe('POST requests', () => {
    it('should make a POST request to the correct URL with body and default headers', (done) => {
      const testPath = '/test-post';
      const mockBody = { data: 'post data' };
      const mockResponse = { id: '123' };

      service.post(testPath, mockBody).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${testPath}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.headers.get('Accept')).toBe('application/json');
      expect(req.request.body).toEqual(mockBody);
      req.flush(mockResponse);
    });
  });

  describe('DELETE requests', () => {
    it('should make a DELETE request to the correct URL with default headers', (done) => {
      const testPath = '/test-delete';
      const mockResponse = { deleted: true };

      service.delete(testPath).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${testPath}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Content-Type')).toBe('application/json'); // Though typically no body, headers might still be set
      expect(req.request.headers.get('Accept')).toBe('application/json');
      req.flush(mockResponse);
    });
  });
});

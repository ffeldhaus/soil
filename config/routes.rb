Rails.application.routes.draw do
  mount_devise_token_auth_for 'Admin', at: '/api/v1/admin'
  mount_devise_token_auth_for 'Player', at: '/api/v1/player'

  # load Soil Web App on root
  root 'soil#index'

  namespace :api, constraints: {format: :json} do
    namespace :v1 do
      # Authenticate players, supervisors and admins
      post 'auth/login', to: 'authenticate#login'
      resources :admin, only: :create
      resources :game, only: [:index, :show, :create, :destroy]
      resources :player, only: :show
      resources :round, only: [:index, :show, :update]
      resources :result, only: [:index, :show]
      resources :field, only: :show
      resources :parcel, only: [:show, :update]
    end
  end

  # redirect all unmatched GET requests to root
  #get '*path', to: redirect('/')
  match '*path', to: 'soil#index', via: :all
end
Rails.application.routes.draw do
  # load Soil Web App on root
  root 'soil#index'

  # Authenticate players, supervisors and admins
  post 'auth/login', to: 'authenticate#login'

  namespace :api, constraints: {format: :json} do
    namespace :v1 do
      resources :game, only: :show
      resources :player, only: :show
      resources :round, only: :show
      resources :field, only: :show
      resources :parcel, only: [:show, :update]
    end
  end

  # redirect all unmatched GET requests to root
  get '*path', to: redirect('/')
end